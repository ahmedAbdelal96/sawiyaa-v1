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

const NO_SHOW_STATUSES = [SessionStatus.PATIENT_NO_SHOW, SessionStatus.PRACTITIONER_NO_SHOW, SessionStatus.BOTH_NO_SHOW] as const;

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

  async execute(input: { sessionId: string; adminId: string; actorRoles?: string[]; requestId?: string | null; command: { attendanceOutcome: SessionStatus; patientRemedy: SessionResolutionPatientRemedy; practitionerRemedy: SessionResolutionPractitionerRemedy; reasonCode: string; adminNotes: string; idempotencyKey: string; replacementStartAt?: string } }) {
    if (!NO_SHOW_STATUSES.includes(input.command.attendanceOutcome as (typeof NO_SHOW_STATUSES)[number])) throw new ConflictException({ error: 'SESSION_RESOLUTION_OUTCOME_INVALID' });
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
      if (input.command.patientRemedy === SessionResolutionPatientRemedy.RESTORE_PACKAGE && (!session.packagePurchaseId || session.paymentCoverageType !== 'PACKAGE')) throw new ConflictException({ error: 'SESSION_RESOLUTION_RESTORE_REQUIRES_PACKAGE' });
      if (input.command.patientRemedy === SessionResolutionPatientRemedy.CREDIT_WALLET && !(await tx.payment.findFirst({ where: { sessionId: session.id, amountTotal: { gt: 0 } } }))) throw new ConflictException({ error: 'SESSION_RESOLUTION_WALLET_CREDIT_REQUIRES_VALUE' });
      if (input.command.patientRemedy === SessionResolutionPatientRemedy.CREATE_REPLACEMENT_SESSION && !input.command.replacementStartAt) throw new ConflictException({ error: 'SESSION_RESOLUTION_REPLACEMENT_TIME_REQUIRED' });
      // The patient remedy is exactly one enum value, so replacement cannot be combined with another primary remedy.

      const evidence = resolutionCase.evidenceSnapshotJson;
      const at = new Date();
      let effects: Record<string, unknown> = { wallet: 'NONE', package: 'NONE', earningReview: 'NONE' };
      const financialOutcome = input.command.patientRemedy === SessionResolutionPatientRemedy.CREDIT_WALLET || input.command.patientRemedy === SessionResolutionPatientRemedy.RESTORE_PACKAGE
        ? 'PRACTITIONER_NO_SHOW'
        : input.command.attendanceOutcome === SessionStatus.PATIENT_NO_SHOW && input.command.practitionerRemedy === SessionResolutionPractitionerRemedy.CREATE_EARNING_REVIEW ? 'PATIENT_NO_SHOW' : null;
      let lifecycleSession = await this.lifecycle.transition({ session, to: input.command.attendanceOutcome, tx, actorUserId: input.adminId, actorType: SecurityAuditActorType.USER, actorRoles: input.actorRoles, source: SecurityAuditSource.HTTP_REQUEST, requestId, reason: input.command.reasonCode, metadata: { source: 'admin-session-resolution' } });
      if (financialOutcome) {
        const result = await this.noShowFinancials.apply({ tx, session: lifecycleSession as typeof session, outcome: financialOutcome, adminUserId: input.adminId, actorRoles: input.actorRoles, requestId, correlationId: input.requestId ?? null, reasonCode: input.command.reasonCode, decidedAt: at });
        effects = { ...effects, package: result.packageDecision, wallet: result.walletEffect, earningReview: result.earningEffect, refundId: result.refundId, refundAmount: result.refundAmount };
      }
      if (input.command.practitionerRemedy === SessionResolutionPractitionerRemedy.CREATE_EARNING_REVIEW) {
        const review = await this.earningReviews.syncForAdminResolution({ sessionId: session.id, tx });
        effects = { ...effects, earningReview: review?.reviewId ?? 'UNAVAILABLE' };
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
      const resolution = await tx.sessionResolution.create({ data: { caseId: resolutionCase.id, sessionId: session.id, attendanceOutcome: input.command.attendanceOutcome, patientRemedy: input.command.patientRemedy, practitionerRemedy: input.command.practitionerRemedy, reasonCode: input.command.reasonCode, adminNotes: input.command.adminNotes.trim(), actedByAdminId: input.adminId, requestId, evidenceSnapshotJson: evidence as Prisma.InputJsonValue, effectsSnapshotJson: effects as Prisma.InputJsonValue, replacementSessionId } });
      await tx.sessionResolutionCase.update({ where: { id: resolutionCase.id }, data: { status: 'EXECUTED', resolvedAt: at } });
      await tx.sessionEvent.create({ data: { sessionId: session.id, eventType: SessionEventType.ADMIN_MANUAL_DECISION_CREATED, actorType: SecurityAuditActorType.USER, actorUserId: input.adminId, actorRolesJson: input.actorRoles, source: SecurityAuditSource.HTTP_REQUEST, requestId, correlationId: input.requestId ?? null, reason: input.command.reasonCode, previousStatus: SessionStatus.AWAITING_ADMIN_RESOLUTION, newStatus: input.command.attendanceOutcome, occurredAt: at, metadataJson: { resolutionId: resolution.id, patientRemedy: input.command.patientRemedy, practitionerRemedy: input.command.practitionerRemedy, effects } as Prisma.InputJsonObject } });
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
