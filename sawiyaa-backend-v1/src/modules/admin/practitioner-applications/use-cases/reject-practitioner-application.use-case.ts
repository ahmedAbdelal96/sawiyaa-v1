import { Injectable, NotFoundException } from '@nestjs/common';
import {
  PractitionerApplicationStatus,
  PractitionerStatus,
  Prisma,
} from '@prisma/client';
import { SecurityAuditOutcome } from '@prisma/client';
import { SecurityAuditService } from '@common/security-audit/security-audit.service';
import {
  SecurityAuditActorType,
  SecurityAuditSource,
} from '@common/security-audit/security-audit.types';
import { I18nService } from '@common/i18n/services/i18n.service';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { PrismaService } from '@common/prisma/prisma.service';
import { PractitionerApplicationsAdminMapper } from '../mappers/practitioner-applications-admin.mapper';
import { PractitionerApplicationTransitionPolicy } from '../policies/practitioner-application-transition.policy';
import { AdminPractitionerApplicationRepository } from '../repositories/admin-practitioner-application.repository';
import { AdminPractitionerProfileRepository } from '../repositories/admin-practitioner-profile.repository';
import { AdminPractitionerApplicationNotificationService } from '../services/admin-practitioner-application-notification.service';

/**
 * Rejects a practitioner application after transition-policy checks.
 * Rejection reason is mandatory and persisted to reviewNotes for baseline auditability in current schema.
 */
@Injectable()
export class RejectPractitionerApplicationUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly i18nService: I18nService,
    private readonly mapper: PractitionerApplicationsAdminMapper,
    private readonly transitionPolicy: PractitionerApplicationTransitionPolicy,
    private readonly applicationRepository: AdminPractitionerApplicationRepository,
    private readonly profileRepository: AdminPractitionerProfileRepository,
    private readonly notificationService: AdminPractitionerApplicationNotificationService,
    private readonly securityAuditService: SecurityAuditService,
  ) {}

  async execute(input: {
    id: string;
    locale: SupportedLocale;
    adminUserId: string;
    operatorRoles: string[];
    reason: string;
    note?: string;
  }) {
    const existing = await this.applicationRepository.findById(input.id);

    if (!existing) {
      this.securityAuditService.logAsync({
        action: 'security.practitioner.application.reject',
        outcome: SecurityAuditOutcome.FAILURE,
        actorUserId: input.adminUserId,
        actorRoles: input.operatorRoles,
        resourceType: 'PractitionerApplication',
        resourceId: input.id,
        reason: 'APPLICATION_NOT_FOUND',
      });
      throw new NotFoundException({
        messageKey: 'admin.practitionerApplications.errors.applicationNotFound',
        error: 'ADMIN_PRACTITIONER_APPLICATION_NOT_FOUND',
      });
    }

    this.transitionPolicy.assertCanReject(existing.status);

    if (!existing.practitioner) {
      const reason = input.reason.trim();
      if (!reason) throw new NotFoundException({ error: 'ADMIN_PRACTITIONER_APPLICATION_INVALID_REASON' });
      const reviewedAt = new Date();
      const updated = await this.prisma.$transaction(async (tx) => {
        const decision = await this.applicationRepository.updateDecision(input.id, {
          status: PractitionerApplicationStatus.REJECTED,
          reviewedAt,
          reviewedByUserId: input.adminUserId,
          reviewDecisionReason: reason,
          reviewNotes: input.note?.trim() || null,
        }, tx);
        await tx.practitionerReviewCase.updateMany({
          where: { applicationId: input.id, status: { in: ['PENDING_REVIEW', 'UNDER_REVIEW', 'RESUBMITTED'] } },
          data: { status: 'REJECTED', reviewedAt, reviewedByUserId: input.adminUserId, decisionReason: reason },
        });
        await this.securityAuditService.recordRequired(tx, {
          action: 'security.practitioner.application.reject', outcome: SecurityAuditOutcome.SUCCESS,
          actorType: SecurityAuditActorType.USER, source: SecurityAuditSource.HTTP_REQUEST,
          actorUserId: input.adminUserId, actorRoles: input.operatorRoles, resourceType: 'PractitionerApplication', resourceId: input.id, targetUserId: existing.userId, reason,
        });
        return decision;
      });
      await this.notificationService.sendRejected({ userId: existing.userId, applicationId: updated.id, locale: input.locale, reason });
      return {
        message: this.i18nService.t('admin.practitionerApplications.success.applicationRejected', input.locale),
        application: this.mapper.toDecision({ applicationId: updated.id, practitionerProfileId: null, userId: existing.userId, status: updated.status, reviewedAt: updated.reviewedAt, reviewedByUserId: updated.reviewedByUserId ?? null, reviewDecisionReason: updated.reviewDecisionReason ?? null, reviewNotes: updated.reviewNotes ?? null }),
      };
    }

    const reason = input.reason.trim();
    const note = input.note?.trim();
    const reviewNotes = note || null;
    const reviewedAt = new Date();

    const updated = await this.prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        const latest = await this.applicationRepository.findById(input.id, tx);

        if (!latest) {
          this.securityAuditService.logAsync({
            action: 'security.practitioner.application.reject',
            outcome: SecurityAuditOutcome.FAILURE,
            actorUserId: input.adminUserId,
            actorRoles: input.operatorRoles,
            resourceType: 'PractitionerApplication',
            resourceId: input.id,
            reason: 'APPLICATION_NOT_FOUND_IN_TRANSACTION',
          });
          throw new NotFoundException({
            messageKey:
              'admin.practitionerApplications.errors.applicationNotFound',
            error: 'ADMIN_PRACTITIONER_APPLICATION_NOT_FOUND',
          });
        }

        this.transitionPolicy.assertCanReject(latest.status);

        const decision = await this.applicationRepository.updateDecision(
          input.id,
          {
            status: PractitionerApplicationStatus.REJECTED,
            reviewedAt,
            reviewedByUserId: input.adminUserId,
            reviewDecisionReason: reason,
            reviewNotes,
          },
          tx,
        );

        const currentProfile = await tx.practitionerProfile.findUnique({
          where: { id: decision.practitioner.id },
          select: { status: true },
        });
        if (currentProfile?.status === PractitionerStatus.APPROVED) {
          const snapshot = decision.submissionSnapshot as {
            credentials?: Array<{ credentialId?: string }>;
          } | null;
          const credentialIds = (snapshot?.credentials ?? [])
            .map((item) => item.credentialId)
            .filter((item): item is string => typeof item === 'string');
          if (credentialIds.length > 0) {
            await tx.practitionerCredential.updateMany({
              where: {
                practitionerId: decision.practitioner.id,
                id: { in: credentialIds },
                reviewStatus: 'PENDING',
              },
              data: {
                reviewStatus: 'REJECTED',
                reviewedAt,
                reviewedByUserId: input.adminUserId,
                reviewNotes: reason,
              },
            });
          }
        } else {
          await this.profileRepository.updateStatus(
            decision.practitioner.id,
            PractitionerStatus.REJECTED,
            tx,
          );
        }

        const reviewCase = await tx.practitionerReviewCase.findFirst({
          where: {
            practitionerId: decision.practitioner.id,
            status: { in: ['PENDING_REVIEW', 'UNDER_REVIEW', 'RESUBMITTED'] },
          },
          orderBy: { updatedAt: 'desc' },
        });
        if (reviewCase) {
          await tx.practitionerReviewCase.update({
            where: { id: reviewCase.id },
            data: {
              status: 'REJECTED',
              reviewedAt,
              reviewedByUserId: input.adminUserId,
              decisionReason: reason,
            },
          });
          await tx.practitionerReviewSection.updateMany({
            where: { caseId: reviewCase.id, status: { in: ['PENDING', 'CHANGES_REQUESTED'] } },
            data: { status: 'REJECTED', reviewedAt, reviewedByUserId: input.adminUserId, decisionReason: reason },
          });
        }

        await this.securityAuditService.recordRequired(tx, {
          action: 'security.practitioner.application.reject',
          outcome: SecurityAuditOutcome.SUCCESS,
          actorType: SecurityAuditActorType.USER,
          source: SecurityAuditSource.HTTP_REQUEST,
          actorUserId: input.adminUserId,
          actorRoles: input.operatorRoles,
          resourceType: 'PractitionerApplication',
          resourceId: decision.id,
          targetUserId: decision.practitioner.userId,
          reason,
          metadata: {
            previousApplicationStatus: latest.status,
            newApplicationStatus: decision.status,
            practitionerProfileId: decision.practitioner.id,
          },
        });

        return decision;
      },
    );

    await this.notificationService.sendRejected({
      userId: updated.practitioner.userId,
      applicationId: updated.id,
      locale: input.locale,
      reason,
    });

    return {
      message: this.i18nService.t(
        'admin.practitionerApplications.success.applicationRejected',
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
