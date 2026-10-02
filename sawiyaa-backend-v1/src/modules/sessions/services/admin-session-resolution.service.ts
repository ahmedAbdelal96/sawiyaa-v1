import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, SessionEventType, SessionFundingSource, SessionResolutionPatientRemedy, SessionResolutionPractitionerRemedy, SessionStatus } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { SessionRepository } from '../repositories/session.repository';
import { SessionLifecycleService } from './session-lifecycle.service';
import { ApplyManualNoShowFinancialEffectsService } from './apply-manual-no-show-financial-effects.service';
import { SessionEarningReviewService } from '@modules/financial-operations/services/session-earning-review.service';
import { ValidateSessionDurationService } from './validate-session-duration.service';
import { ValidateSessionConflictsService } from './validate-session-conflicts.service';
import { ValidateSessionScheduleCompatibilityService } from './validate-session-schedule-compatibility.service';
import { SecurityAuditActorType, SecurityAuditSource } from '@common/security-audit/security-audit.types';
import { OperationalNotificationService } from '@modules/notifications/services/operational-notification.service';
import { AdminSessionResolutionPolicyService } from './admin-session-resolution-policy.service';
import type { AdminResolutionFinding } from '../dto/admin-session-resolution.dto';
import { CompleteSessionTransactionService } from './complete-session-transaction.service';

@Injectable()
export class AdminSessionResolutionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sessions: SessionRepository,
    private readonly lifecycle: SessionLifecycleService,
    private readonly noShowFinancials: ApplyManualNoShowFinancialEffectsService,
    private readonly earningReviews: SessionEarningReviewService,
    private readonly duration: ValidateSessionDurationService,
    private readonly conflicts: ValidateSessionConflictsService,
    private readonly schedule: ValidateSessionScheduleCompatibilityService,
    private readonly operationalNotifications: OperationalNotificationService,
    private readonly policy: AdminSessionResolutionPolicyService,
    private readonly completeSession: CompleteSessionTransactionService,
  ) {}

  async list(input: { status?: string; suggestedOutcome?: SessionStatus; practitionerId?: string; patientId?: string; from?: string; to?: string }) {
    return this.prisma.sessionResolutionCase.findMany({
      where: {
        status: (input.status as 'OPEN' | 'EXECUTED' | 'CANCELLED' | undefined) ?? 'OPEN',
        suggestedOutcome: input.suggestedOutcome,
        session: { practitionerId: input.practitionerId, patientId: input.patientId, scheduledStartAt: { gte: input.from ? new Date(input.from) : undefined, lte: input.to ? new Date(input.to) : undefined } },
      },
      orderBy: { openedAt: 'asc' },
      include: { session: { include: { patient: { include: { user: { select: { displayName: true } } } }, practitioner: { include: { user: { select: { displayName: true, timezone: true } } } } } } },
    });
  }

  async get(sessionId: string) {
    const item = await this.prisma.sessionResolutionCase.findUnique({ where: { sessionId }, include: { session: true, resolutions: { orderBy: { actedAt: 'desc' } } } });
    if (!item) throw new NotFoundException({ error: 'SESSION_RESOLUTION_CASE_NOT_FOUND' });
    return item;
  }

  async execute(input: { sessionId: string; adminId: string; actorRoles?: string[]; requestId?: string | null; command: { attendanceOutcome?: SessionStatus; findingCode?: string; patientRemedy: SessionResolutionPatientRemedy; practitionerRemedy: SessionResolutionPractitionerRemedy; reasonCode: string; customReasonNote?: string; adminNotes: string; idempotencyKey: string; previewHash?: string; replacementStartAt?: string } }) {
    const requestId = input.command.idempotencyKey;
    const resolution = await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`session-resolution:${input.sessionId}`})::bigint)`;
      const existing = await tx.sessionResolution.findUnique({ where: { requestId } });
      if (existing) {
        if (existing.sessionId !== input.sessionId) {
          throw new ConflictException({ error: 'SESSION_RESOLUTION_IDEMPOTENCY_KEY_REUSED' });
        }
        return existing;
      }
      const session = await this.sessions.findByIdForUpdate(input.sessionId, tx);
      const resolutionCase = await tx.sessionResolutionCase.findUnique({ where: { sessionId: input.sessionId } });
      if (!session || !resolutionCase) throw new NotFoundException({ error: 'SESSION_RESOLUTION_CASE_NOT_FOUND' });
      if (resolutionCase.status !== 'OPEN' || session.status !== SessionStatus.AWAITING_ADMIN_RESOLUTION) throw new ConflictException({ error: 'SESSION_RESOLUTION_CASE_NOT_OPEN' });
      const plan = await this.policy.buildPlan({ sessionId: input.sessionId, tx, decision: { ...input.command, findingCode: input.command.findingCode as AdminResolutionFinding | undefined } });
      if (input.command.previewHash && input.command.previewHash !== plan.planHash) {
        throw new ConflictException({ error: 'SESSION_RESOLUTION_PREVIEW_STALE', messageKey: 'sessions.errors.resolutionPreviewStale' });
      }
      // The patient remedy is exactly one enum value, so replacement cannot be combined with another primary remedy.

      const evidence = resolutionCase.evidenceSnapshotJson;
      const at = new Date();
      let effects: Record<string, unknown> = { wallet: 'NONE', package: 'NONE', earningReview: 'NONE' };
      let explicitEarningReviewId: string | null = null;
      const findingCode = plan.findingCode;
      const lifecycleOutcome = plan.resultingStatus;
      const financialOutcome = input.command.patientRemedy === SessionResolutionPatientRemedy.CREDIT_WALLET || input.command.patientRemedy === SessionResolutionPatientRemedy.RESTORE_PACKAGE
        ? 'PRACTITIONER_NO_SHOW'
        : findingCode === 'PATIENT_NO_SHOW' && input.command.practitionerRemedy === SessionResolutionPractitionerRemedy.CREATE_EARNING_REVIEW ? 'PATIENT_NO_SHOW' : null;
      if (input.command.practitionerRemedy === SessionResolutionPractitionerRemedy.CREATE_EARNING_REVIEW && input.command.patientRemedy === SessionResolutionPatientRemedy.CREDIT_WALLET) {
        const review = await this.earningReviews.syncForAdminResolution({ sessionId: session.id, tx, allowPendingResolution: true });
        explicitEarningReviewId = review?.reviewId ?? null;
      }
      let lifecycleSession = session;
      if (findingCode === 'SESSION_COMPLETED_AFTER_REVIEW') {
        lifecycleSession = await this.completeSession.execute({ session, tx, at, actorUserId: input.adminId, actorType: SecurityAuditActorType.USER, actorRoles: input.actorRoles, source: SecurityAuditSource.HTTP_REQUEST, requestId, reason: input.command.reasonCode, metadata: { source: 'admin-session-resolution', findingCode } });
      } else {
        lifecycleSession = await this.lifecycle.transition({ session, to: lifecycleOutcome, tx, actorUserId: input.adminId, actorType: SecurityAuditActorType.USER, actorRoles: input.actorRoles, source: SecurityAuditSource.HTTP_REQUEST, requestId, reason: input.command.reasonCode, metadata: { source: 'admin-session-resolution', findingCode } });
      }
      if (financialOutcome && !(input.command.patientRemedy === SessionResolutionPatientRemedy.CREDIT_WALLET && session.paymentCoverageType === 'PACKAGE')) {
        const result = await this.noShowFinancials.apply({ tx, session: lifecycleSession as typeof session, outcome: financialOutcome, adminUserId: input.adminId, actorRoles: input.actorRoles, requestId, correlationId: input.requestId ?? null, reasonCode: input.command.reasonCode, decidedAt: at, preservePendingEarningReview: Boolean(explicitEarningReviewId) });
        effects = { ...effects, package: result.packageDecision, wallet: result.walletEffect, earningReview: result.earningEffect, refundId: result.refundId, refundAmount: result.refundAmount };
      }
      if (input.command.patientRemedy === SessionResolutionPatientRemedy.CREDIT_WALLET && session.paymentCoverageType === 'PACKAGE') {
        const purchase = await tx.patientPackagePurchase.findUnique({ where: { id: session.packagePurchaseId! } });
        if (!purchase?.paymentId || !plan.patient.walletCredit) throw new ConflictException({ error: 'SESSION_RESOLUTION_PACKAGE_REFUND_VALUE_UNAVAILABLE' });
        const refund = await this.noShowFinancials.applyPackageWalletCredit({
          tx,
          session: lifecycleSession as typeof session,
          paymentId: purchase.paymentId,
          amount: plan.patient.walletCredit.amount,
          currencyCode: plan.patient.walletCredit.currency,
          adminUserId: input.adminId,
          reasonCode: input.command.reasonCode,
        });
        effects = { ...effects, wallet: 'PATIENT_WALLET_CREDIT', refundId: refund.generatedRefundId, refundAmount: refund.refundAmount, package: 'WALLET_CREDIT' };
      }
      if (input.command.practitionerRemedy === SessionResolutionPractitionerRemedy.CREATE_EARNING_REVIEW) {
        if (findingCode === 'SESSION_COMPLETED_AFTER_REVIEW') {
          effects = { ...effects, earningReview: 'CREATED_BY_COMPLETION' };
        } else {
          const review = explicitEarningReviewId ? { reviewId: explicitEarningReviewId } : await this.earningReviews.syncForAdminResolution({ sessionId: session.id, tx, allowPendingResolution: true });
          effects = { ...effects, earningReview: review?.reviewId ?? 'UNAVAILABLE' };
        }
      }

      let replacementSessionId: string | null = null;
      if (input.command.patientRemedy === SessionResolutionPatientRemedy.CREATE_REPLACEMENT_SESSION) {
        const entitlementReviews = await tx.sessionEarningReview.findMany({
          where: { earningEntitlementId: session.earningEntitlementId },
          select: {
            id: true,
            reviewStatus: true,
            settlementId: true,
            ledgerEntries: { select: { id: true }, take: 1 },
            settlement: { select: { status: true } },
          },
        });
        const irreversible = entitlementReviews.some((review) =>
          review.reviewStatus === 'APPROVED' ||
          Boolean(review.settlementId) ||
          review.ledgerEntries.length > 0 ||
          ['APPROVED', 'CREDITED', 'PAID_OUT', 'PAID', 'PROCESSING'].includes(review.settlement?.status ?? ''),
        );
        if (irreversible) {
          throw new ConflictException({ error: 'SESSION_RESOLUTION_REPLACEMENT_EARNING_ALREADY_IRREVERSIBLE' });
        }
        if (entitlementReviews.length > 0) {
          await tx.sessionEarningReview.updateMany({
            where: {
              earningEntitlementId: session.earningEntitlementId,
              reviewStatus: 'PENDING_REVIEW',
            },
            data: {
              reviewStatus: 'EXCLUDED_FROM_PAYOUT',
              reviewDecision: 'EXCLUDED_FROM_PAYOUT',
              internalReason: 'SUPERSEDED_BY_ADMIN_REPLACEMENT_SESSION',
              reviewedAt: at,
            },
          });
        }
        const start = new Date(input.command.replacementStartAt!);
        this.duration.validate(session.durationMinutes as 30 | 60);
        if (Number.isNaN(start.getTime()) || start <= at) throw new ConflictException({ error: 'SESSION_RESOLUTION_REPLACEMENT_TIME_INVALID' });
        const end = new Date(start.getTime() + session.durationMinutes * 60_000);
        const practitioner = await tx.practitionerProfile.findUnique({ where: { id: session.practitionerId }, include: { user: { select: { timezone: true } } } });
        await this.schedule.assertFitsPractitionerAvailability({ practitionerId: session.practitionerId, practitionerTimezone: practitioner?.user.timezone ?? null, requestedStartAtUtc: start, requestedEndAtUtc: end, requestedDurationMinutes: session.durationMinutes as 30 | 60 });
        await this.conflicts.assertNoPractitionerConflict({ practitionerId: session.practitionerId, scheduledStartAtUtc: start, scheduledEndAtUtc: end, tx });
        await this.conflicts.assertNoPatientConflict({ patientId: session.patientId, scheduledStartAtUtc: start, scheduledEndAtUtc: end, tx });
        const replacement = await this.sessions.createSession({ patientId: session.patientId, practitionerId: session.practitionerId, flowType: session.flowType, sessionMode: session.sessionMode, durationMinutes: session.durationMinutes, status: SessionStatus.UPCOMING, requestedStartAt: start, scheduledStartAt: start, scheduledEndAt: end, timezoneSnapshot: session.timezoneSnapshot, fundingSource: SessionFundingSource.ADMIN_REPLACEMENT, originalSessionId: session.id, earningEntitlementId: session.earningEntitlementId, paymentCoverageType: session.paymentCoverageType, packagePurchaseId: null, packageSessionIndex: null, packageSessionCount: null }, tx, 'admin-replacement');
        replacementSessionId = replacement.id;
        effects = { ...effects, replacementSessionId };
        await this.sessions.createEvent({ sessionId: replacement.id, eventType: SessionEventType.SESSION_CREATED, actorType: SecurityAuditActorType.USER, actorUserId: input.adminId, source: SecurityAuditSource.HTTP_REQUEST, reason: 'ADMIN_REPLACEMENT', occurredAt: at, metadataJson: { originalSessionId: session.id, resolutionIdempotencyKey: requestId, fundingSource: SessionFundingSource.ADMIN_REPLACEMENT } }, tx);
      }
      const resolution = await tx.sessionResolution.create({ data: { caseId: resolutionCase.id, sessionId: session.id, attendanceOutcome: lifecycleOutcome, findingCode, customReasonNote: input.command.customReasonNote?.trim() || null, patientRemedy: input.command.patientRemedy, practitionerRemedy: input.command.practitionerRemedy, reasonCode: input.command.reasonCode, adminNotes: input.command.adminNotes.trim(), actedByAdminId: input.adminId, requestId, evidenceSnapshotJson: evidence as Prisma.InputJsonValue, effectsSnapshotJson: effects as Prisma.InputJsonValue, replacementSessionId } });
      await tx.sessionResolutionCase.update({ where: { id: resolutionCase.id }, data: { status: 'EXECUTED', resolvedAt: at } });
      await tx.sessionEvent.create({ data: { sessionId: session.id, eventType: SessionEventType.ADMIN_MANUAL_DECISION_CREATED, actorType: SecurityAuditActorType.USER, actorUserId: input.adminId, actorRolesJson: input.actorRoles, source: SecurityAuditSource.HTTP_REQUEST, requestId, correlationId: input.requestId ?? null, reason: input.command.reasonCode, previousStatus: SessionStatus.AWAITING_ADMIN_RESOLUTION, newStatus: lifecycleOutcome, occurredAt: at, metadataJson: { resolutionId: resolution.id, findingCode, patientRemedy: input.command.patientRemedy, practitionerRemedy: input.command.practitionerRemedy, effects } as Prisma.InputJsonObject } });
      return resolution;
    });

    // Replacement reminders are queued only after the resolution commits. The
    // notification service is idempotent, so retrying the resolution request
    // can safely repair delivery after a post-commit worker interruption.
    if (resolution.replacementSessionId) {
      const replacement = await this.sessions.findById(resolution.replacementSessionId);
      if (replacement) {
        await this.operationalNotifications.notifySessionConfirmed({
          sessionId: replacement.id,
          patientProfileId: replacement.patient.id,
          practitionerProfileId: replacement.practitioner.id,
          scheduledStartAt: replacement.scheduledStartAt,
          scheduleRevision: replacement.scheduleRevision,
        });
      }
    }

    return resolution;
  }
}
