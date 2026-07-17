import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, SessionEventType, SessionPaymentCoverageType, SessionStatus } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { SessionEarningReviewService } from '@modules/financial-operations/services/session-earning-review.service';
import { SessionRepository } from '../repositories/session.repository';
import type {
  PackageEntitlementDecisionType,
  PackageEntitlementReasonCode,
} from '../dto/create-admin-session-package-entitlement-decision.dto';
import type { AdminSessionPackageEntitlementDecisionItemDto } from '../dto/admin-session-package-entitlement-decision-response.dto';
import {
  SecurityAuditActorType,
  SecurityAuditSource,
} from '@common/security-audit/security-audit.types';

type DecisionWithUser = Prisma.SessionPackageEntitlementDecisionGetPayload<{
  include: { decidedByUser: { select: { id: true; displayName: true } } };
}>;

const ALLOWED_SESSION_STATUSES = new Set<SessionStatus>([
  SessionStatus.CANCELLED,
  SessionStatus.PATIENT_NO_SHOW,
  SessionStatus.PRACTITIONER_NO_SHOW,
  SessionStatus.BOTH_NO_SHOW,
]);

const PACKAGE_DECISION_LOCK_PREFIX = 'package-entitlement-decision';

@Injectable()
export class CreateAdminSessionPackageEntitlementDecisionUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sessionRepository: SessionRepository,
    private readonly sessionEarningReviewService: SessionEarningReviewService,
  ) {}

  async execute(input: {
    sessionId: string;
    decidedByUserId: string;
    decisionType: PackageEntitlementDecisionType;
    reasonCode: PackageEntitlementReasonCode;
    adminNote?: string | null;
    idempotencyKey: string;
    actorRoles?: string[];
    requestId?: string | null;
    correlationId?: string | null;
  }): Promise<AdminSessionPackageEntitlementDecisionItemDto> {
    const session = await this.sessionRepository.findByIdWithParticipants(input.sessionId);
    if (!session) {
      throw new NotFoundException({
        messageKey: 'sessions.errors.sessionNotFound',
        error: 'SESSION_NOT_FOUND',
      });
    }

    if (
      session.paymentCoverageType !== SessionPaymentCoverageType.PACKAGE ||
      !session.packagePurchaseId
    ) {
      throw new ConflictException({
        messageKey: 'sessions.errors.packageEntitlementDecisionNotPackageSession',
        error: 'SESSION_PACKAGE_ENTITLEMENT_DECISION_NOT_PACKAGE_SESSION',
      });
    }

    if (!ALLOWED_SESSION_STATUSES.has(session.status)) {
      throw new ConflictException({
        messageKey: 'sessions.errors.packageEntitlementDecisionNotAllowedStatus',
        error: 'SESSION_PACKAGE_ENTITLEMENT_DECISION_NOT_ALLOWED_STATUS',
      });
    }

    if (input.reasonCode === 'PRACTITIONER_FAULT' && input.decisionType === 'COUNT_AS_USED') {
      throw new ConflictException({
        messageKey: 'sessions.errors.packageEntitlementDecisionInvalidCombination',
        error: 'SESSION_PACKAGE_ENTITLEMENT_DECISION_INVALID_COMBINATION',
      });
    }

    const existing = await this.prisma.sessionPackageEntitlementDecision.findUnique({
      where: { sessionId: input.sessionId },
      include: this.decisionInclude,
    });

    if (existing) {
      if (existing.idempotencyKey === input.idempotencyKey) {
        return this.toResponseDto(existing);
      }

      throw new ConflictException({
        messageKey: 'sessions.errors.packageEntitlementDecisionAlreadyExists',
        error: 'SESSION_PACKAGE_ENTITLEMENT_DECISION_ALREADY_EXISTS',
      });
    }

    const created = await this.prisma.$transaction(async (tx): Promise<DecisionWithUser> => {
      await tx.$executeRaw`
        SELECT pg_advisory_xact_lock(hashtext(${`${PACKAGE_DECISION_LOCK_PREFIX}:${input.sessionId}`})::bigint)
      `;

      const lockedExisting = await tx.sessionPackageEntitlementDecision.findUnique({
        where: { sessionId: input.sessionId },
        include: this.decisionInclude,
      });

      if (lockedExisting) {
        if (lockedExisting.idempotencyKey === input.idempotencyKey) {
          return lockedExisting as DecisionWithUser;
        }

        throw new ConflictException({
          messageKey: 'sessions.errors.packageEntitlementDecisionAlreadyExists',
          error: 'SESSION_PACKAGE_ENTITLEMENT_DECISION_ALREADY_EXISTS',
        });
      }

      let resultingSessionEarningReviewId: string | null = null;
      if (input.decisionType === 'COUNT_AS_USED') {
        const reviewSync =
          await this.sessionEarningReviewService.syncForPackageEntitlementDecision({
            sessionId: session.id,
            tx,
          });

        if (!reviewSync) {
          throw new ConflictException({
            messageKey:
              'sessions.errors.packageEntitlementDecisionReviewUnavailable',
            error: 'SESSION_PACKAGE_ENTITLEMENT_DECISION_REVIEW_UNAVAILABLE',
          });
        }

        resultingSessionEarningReviewId = reviewSync.reviewId;
      }

      const decision = await tx.sessionPackageEntitlementDecision.create({
        data: {
          sessionId: session.id,
          packagePurchaseId: session.packagePurchaseId!,
          patientId: session.patientId,
          practitionerId: session.practitionerId,
          sessionStatusSnapshot: session.status,
          decisionType: input.decisionType,
          reasonCode: input.reasonCode,
          adminNote: input.adminNote?.trim() || undefined,
          decidedByUserId: input.decidedByUserId,
          resultingSessionEarningReviewId,
          decidedAt: new Date(),
          idempotencyKey: input.idempotencyKey,
        },
        include: this.decisionInclude,
      });

      await tx.sessionEvent.create({
        data: {
          sessionId: session.id,
          eventType: SessionEventType.ADMIN_MANUAL_DECISION_CREATED,
          actorUserId: input.decidedByUserId,
          actorType: SecurityAuditActorType.USER,
          actorRolesJson: input.actorRoles,
          source: SecurityAuditSource.HTTP_REQUEST,
          requestId: input.requestId,
          correlationId: input.correlationId,
          reason: input.reasonCode,
          previousStatus: session.status,
          newStatus: session.status,
          occurredAt: decision.decidedAt,
          metadataJson: {
            decisionScope: 'PACKAGE_ENTITLEMENT',
            decisionId: decision.id,
            decisionType: input.decisionType,
            reasonCode: input.reasonCode,
            sessionStatusSnapshot: session.status,
            packagePurchaseId: session.packagePurchaseId,
            resultingSessionEarningReviewId,
            idempotencyKey: input.idempotencyKey,
          },
        },
      });

      return decision as DecisionWithUser;
    });

    return this.toResponseDto(created as DecisionWithUser);
  }

  private toResponseDto(
    decision: DecisionWithUser,
  ): AdminSessionPackageEntitlementDecisionItemDto {
    return {
      id: decision.id,
      sessionId: decision.sessionId,
      packagePurchaseId: decision.packagePurchaseId,
      sessionStatusSnapshot: decision.sessionStatusSnapshot,
      decisionType: decision.decisionType,
      reasonCode: decision.reasonCode,
      adminNote: decision.adminNote,
      resultingSessionEarningReviewId: decision.resultingSessionEarningReviewId,
      decidedBy: {
        userId: decision.decidedByUser.id,
        displayName: decision.decidedByUser.displayName,
      },
      decidedAt: decision.decidedAt.toISOString(),
      idempotencyKey: decision.idempotencyKey,
    };
  }

  private readonly decisionInclude = {
    decidedByUser: {
      select: {
        id: true,
        displayName: true,
      },
    },
  } satisfies Prisma.SessionPackageEntitlementDecisionInclude;
}
