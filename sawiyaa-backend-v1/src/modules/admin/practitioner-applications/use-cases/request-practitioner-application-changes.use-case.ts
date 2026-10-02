import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Optional,
} from '@nestjs/common';
import { PractitionerApplicationStatus, Prisma, ReviewCaseStatus, ReviewRequirementSeverity, SecurityAuditOutcome } from '@prisma/client';
import { I18nService } from '@common/i18n/services/i18n.service';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { PrismaService } from '@common/prisma/prisma.service';
import { PractitionerApplicationsAdminMapper } from '../mappers/practitioner-applications-admin.mapper';
import { PractitionerApplicationTransitionPolicy } from '../policies/practitioner-application-transition.policy';
import { AdminPractitionerApplicationRepository } from '../repositories/admin-practitioner-application.repository';
import { AdminPractitionerApplicationNotificationService } from '../services/admin-practitioner-application-notification.service';
import { SecurityAuditService } from '@common/security-audit/security-audit.service';
import { SecurityAuditActorType, SecurityAuditSource } from '@common/security-audit/security-audit.types';
import { PractitionerReviewCaseService } from '@modules/practitioners/services/practitioner-review-case.service';

/**
 * Requests changes for a practitioner application.
 * This is the "editable again" decision path between submission and final approve/reject.
 */
@Injectable()
export class RequestPractitionerApplicationChangesUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly i18nService: I18nService,
    private readonly mapper: PractitionerApplicationsAdminMapper,
    private readonly transitionPolicy: PractitionerApplicationTransitionPolicy,
    private readonly applicationRepository: AdminPractitionerApplicationRepository,
    private readonly notificationService: AdminPractitionerApplicationNotificationService,
    private readonly reviewCaseService: PractitionerReviewCaseService,
    @Optional() private readonly securityAuditService?: SecurityAuditService,
  ) {}

  async execute(input: {
    id: string;
    locale: SupportedLocale;
    adminUserId: string;
    reason: string;
    note?: string;
    requirements?: Array<{
      section: any;
      fieldPath?: string;
      credentialType?: any;
      title: string;
      reason: string;
      instructions?: string;
      dueAt?: string;
      severity?: any;
      operationalImpact?: any[];
    }>;
  }) {
    const existing = await this.applicationRepository.findById(input.id);

    if (!existing) {
      throw new NotFoundException({
        messageKey: 'admin.practitionerApplications.errors.applicationNotFound',
        error: 'ADMIN_PRACTITIONER_APPLICATION_NOT_FOUND',
      });
    }

    this.transitionPolicy.assertCanRequestChanges(existing.status);

    const reason = input.reason.trim();
    if (!reason) {
      throw new BadRequestException({
        messageKey:
          'admin.practitionerApplications.errors.invalidApplicationState',
        error: 'ADMIN_PRACTITIONER_APPLICATION_INVALID_REASON',
      });
    }

    const note = input.note?.trim();
    const reviewNotes = note || null;
    const reviewedAt = new Date();

    if (!existing.practitioner) {
      const updated = await this.prisma.$transaction(async (tx) => {
        const latest = await this.applicationRepository.findById(input.id, tx);
        if (!latest || latest.practitioner) throw new NotFoundException({ error: 'ADMIN_PRACTITIONER_APPLICATION_STATE_CHANGED' });
        const decision = await this.applicationRepository.updateDecision(input.id, {
          status: PractitionerApplicationStatus.CHANGES_REQUESTED,
          reviewedAt,
          reviewedByUserId: input.adminUserId,
          reviewDecisionReason: reason,
          reviewNotes,
        }, tx);
        let reviewCase = await tx.practitionerReviewCase.findFirst({ where: { applicationId: input.id, status: { in: ['PENDING_REVIEW', 'UNDER_REVIEW', 'CHANGES_REQUESTED', 'RESUBMITTED'] } } });
        if (!reviewCase) {
          reviewCase = await tx.practitionerReviewCase.create({ data: { applicationId: input.id, userId: existing.userId, caseType: 'ONBOARDING', status: 'PENDING_REVIEW', submittedAt: latest.submittedAt, proposedSnapshot: latest.submissionSnapshot, dueAt: this.reviewCaseService.getReviewDueAt() } });
        }
        await this.reviewCaseService.requestChanges({
          caseId: reviewCase.id,
          adminUserId: input.adminUserId,
          reason,
          requirements: (input.requirements ?? [{ section: 'PROFILE', fieldPath: 'application.submissionSnapshot', title: reason, reason, severity: 'BLOCKING' }]).map((item) => ({ ...item, dueAt: item.dueAt ? new Date(item.dueAt) : undefined })),
          tx,
        });
        return decision;
      });
      await this.notificationService.sendChangesRequested({ userId: existing.userId, applicationId: updated.id, locale: input.locale, reason });
      return { message: this.i18nService.t('admin.practitionerApplications.success.changesRequested', input.locale), application: this.mapper.toDecision({ applicationId: updated.id, practitionerProfileId: null, userId: existing.userId, status: updated.status, reviewedAt: updated.reviewedAt, reviewedByUserId: updated.reviewedByUserId ?? null, reviewDecisionReason: updated.reviewDecisionReason ?? null, reviewNotes: updated.reviewNotes ?? null }) };
    }

    const updated = await this.prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        const latest = await this.applicationRepository.findById(input.id, tx);

        if (!latest) {
          throw new NotFoundException({
            messageKey:
              'admin.practitionerApplications.errors.applicationNotFound',
            error: 'ADMIN_PRACTITIONER_APPLICATION_NOT_FOUND',
          });
        }

        this.transitionPolicy.assertCanRequestChanges(latest.status);

        const decision = await this.applicationRepository.updateDecision(
          input.id,
          {
            status: PractitionerApplicationStatus.CHANGES_REQUESTED,
            reviewedAt,
            reviewedByUserId: input.adminUserId,
            reviewDecisionReason: reason,
            reviewNotes,
          },
          tx,
        );

        const reviewCase = await tx.practitionerReviewCase.findFirst({
          where: {
            practitionerId: latest.practitioner.id,
            status: {
              in: [
                ReviewCaseStatus.PENDING_REVIEW,
                ReviewCaseStatus.UNDER_REVIEW,
                ReviewCaseStatus.CHANGES_REQUESTED,
                ReviewCaseStatus.RESUBMITTED,
              ],
            },
          },
          orderBy: { updatedAt: 'desc' },
        });
        const requirements = input.requirements ?? [
          {
            section: 'PROFILE',
            fieldPath: 'application.submissionSnapshot',
            title: reason,
            reason,
            severity: ReviewRequirementSeverity.BLOCKING,
          },
        ];
        if (reviewCase) {
          await this.reviewCaseService.requestChanges({
            caseId: reviewCase.id,
            adminUserId: input.adminUserId,
            reason,
            requirements: requirements.map((item) => ({
              ...item,
              dueAt: item.dueAt ? new Date(item.dueAt) : undefined,
            })),
            tx,
          });
        }
        await this.securityAuditService?.recordRequired(tx, {
          action: 'security.practitioner.application.request-changes',
          outcome: SecurityAuditOutcome.SUCCESS,
          actorType: SecurityAuditActorType.USER,
          source: SecurityAuditSource.HTTP_REQUEST,
          actorUserId: input.adminUserId,
          resourceType: 'PractitionerApplication',
          resourceId: decision.id,
          targetUserId: decision.practitioner.userId,
          reason,
          metadata: {
            previousStatus: latest.status,
            status: decision.status,
          },
        });
        return decision;
      },
    );

    await this.notificationService.sendChangesRequested({
      userId: updated.practitioner.userId,
      applicationId: updated.id,
      locale: input.locale,
      reason,
    });

    return {
      message: this.i18nService.t(
        'admin.practitionerApplications.success.changesRequested',
        input.locale,
      ),
      application: this.mapper.toDecision({
        applicationId: updated.id,
        practitionerProfileId: updated.practitioner.id,
        userId: updated.practitioner.userId,
        status: updated.status,
        reviewedAt: updated.reviewedAt,
        reviewedByUserId: updated.reviewedByUserId ?? null,
        reviewDecisionReason: updated.reviewDecisionReason ?? null,
        reviewNotes: updated.reviewNotes ?? null,
      }),
    };
  }
}
