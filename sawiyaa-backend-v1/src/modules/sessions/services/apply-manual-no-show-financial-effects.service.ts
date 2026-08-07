import { ConflictException, Injectable } from '@nestjs/common';
import {
  Prisma,
  RefundDestination,
  Session,
  SessionCancellationBookingType,
  SessionCancellationRefundMode,
  SessionEventType,
  SessionFlowType,
  SessionPaymentCoverageType,
} from '@prisma/client';
import { SessionEarningReviewService } from '@modules/financial-operations/services/session-earning-review.service';
import { ApplySessionCancellationFinancialEffectsService } from './apply-session-cancellation-financial-effects.service';
import {
  SecurityAuditActorType,
  SecurityAuditSource,
} from '@common/security-audit/security-audit.types';

export type ManualNoShowOutcome =
  | 'PATIENT_NO_SHOW'
  | 'PRACTITIONER_NO_SHOW'
  | 'BOTH_NO_SHOW';

export type ManualNoShowFinancialEffects = {
  packageDecision: 'COUNT_AS_USED' | 'RESTORE_TO_PACKAGE' | null;
  walletEffect: 'NONE' | 'PATIENT_WALLET_CREDIT';
  earningEffect: 'NORMAL_REVIEW' | 'NONE';
  refundId: string | null;
  refundAmount: string;
  idempotencyKey: string;
};

@Injectable()
export class ApplyManualNoShowFinancialEffectsService {
  constructor(
    private readonly sessionEarningReviewService: SessionEarningReviewService,
    private readonly applyCancellationFinancialEffects: ApplySessionCancellationFinancialEffectsService,
  ) {}

  async apply(input: {
    tx: Prisma.TransactionClient;
    session: Session;
    outcome: ManualNoShowOutcome;
    adminUserId: string;
    actorRoles?: string[];
    requestId?: string | null;
    correlationId?: string | null;
    reasonCode: string;
    decidedAt: Date;
  }): Promise<ManualNoShowFinancialEffects> {
    const idempotencyKey = `manual-no-show:${input.session.id}:${input.outcome}`;
    const isPackage =
      input.session.paymentCoverageType ===
        SessionPaymentCoverageType.PACKAGE &&
      Boolean(input.session.packagePurchaseId);

    if (input.outcome === 'BOTH_NO_SHOW') {
      return {
        packageDecision: null,
        walletEffect: 'NONE',
        earningEffect: 'NONE',
        refundId: null,
        refundAmount: '0.00',
        idempotencyKey,
      };
    }

    if (isPackage) {
      const existing =
        await input.tx.sessionPackageEntitlementDecision.findUnique({
          where: { sessionId: input.session.id },
        });
      if (existing) {
        if (existing.idempotencyKey !== idempotencyKey) {
          throw new ConflictException({
            messageKey:
              'sessions.errors.packageEntitlementDecisionAlreadyExists',
            error: 'SESSION_PACKAGE_ENTITLEMENT_DECISION_ALREADY_EXISTS',
          });
        }
      } else {
        const decisionType =
          input.outcome === 'PATIENT_NO_SHOW'
            ? 'COUNT_AS_USED'
            : 'RESTORE_TO_PACKAGE';
        let resultingSessionEarningReviewId: string | null = null;
        if (decisionType === 'COUNT_AS_USED') {
          const review =
            await this.sessionEarningReviewService.syncForPackageEntitlementDecision(
              {
                sessionId: input.session.id,
                tx: input.tx,
              },
            );
          if (!review) {
            throw new ConflictException({
              messageKey:
                'sessions.errors.packageEntitlementDecisionReviewUnavailable',
              error: 'SESSION_PACKAGE_ENTITLEMENT_DECISION_REVIEW_UNAVAILABLE',
            });
          }
          resultingSessionEarningReviewId = review.reviewId;
        }

        await input.tx.sessionPackageEntitlementDecision.create({
          data: {
            sessionId: input.session.id,
            packagePurchaseId: input.session.packagePurchaseId!,
            patientId: input.session.patientId,
            practitionerId: input.session.practitionerId,
            sessionStatusSnapshot: input.outcome,
            decisionType,
            reasonCode:
              input.outcome === 'PATIENT_NO_SHOW'
                ? 'PATIENT_NO_SHOW'
                : 'PRACTITIONER_FAULT',
            decidedByUserId: input.adminUserId,
            resultingSessionEarningReviewId,
            decidedAt: input.decidedAt,
            idempotencyKey,
          },
        });

        await input.tx.sessionEvent.create({
          data: {
            sessionId: input.session.id,
            eventType: SessionEventType.ADMIN_MANUAL_DECISION_CREATED,
            actorUserId: input.adminUserId,
            actorType: SecurityAuditActorType.USER,
            actorRolesJson: input.actorRoles,
            source: SecurityAuditSource.HTTP_REQUEST,
            requestId: input.requestId,
            correlationId: input.correlationId,
            reason: input.reasonCode,
            previousStatus: input.outcome,
            newStatus: input.outcome,
            occurredAt: input.decidedAt,
            metadataJson: {
              decisionScope: 'PACKAGE_ENTITLEMENT',
              decisionType,
              idempotencyKey,
              source: 'manual-no-show-policy',
            },
          },
        });
      }

      return {
        packageDecision:
          input.outcome === 'PATIENT_NO_SHOW'
            ? 'COUNT_AS_USED'
            : 'RESTORE_TO_PACKAGE',
        walletEffect: 'NONE',
        earningEffect:
          input.outcome === 'PATIENT_NO_SHOW' ? 'NORMAL_REVIEW' : 'NONE',
        refundId: null,
        refundAmount: '0.00',
        idempotencyKey,
      };
    }

    if (input.outcome === 'PATIENT_NO_SHOW') {
      const review =
        await this.sessionEarningReviewService.syncForPatientNoShow({
          sessionId: input.session.id,
          tx: input.tx,
        });
      if (!review) {
        throw new ConflictException({
          messageKey: 'sessions.errors.sessionEarningReviewUnavailable',
          error: 'SESSION_EARNING_REVIEW_UNAVAILABLE',
        });
      }
      return {
        packageDecision: null,
        walletEffect: 'NONE',
        earningEffect: 'NORMAL_REVIEW',
        refundId: null,
        refundAmount: '0.00',
        idempotencyKey,
      };
    }

    const bookingType =
      input.session.flowType === SessionFlowType.INSTANT
        ? SessionCancellationBookingType.INSTANT
        : SessionCancellationBookingType.STANDARD;
    const result = await this.applyCancellationFinancialEffects.apply({
      tx: input.tx,
      session: input.session,
      evaluation: {
        bookingType,
        policyId: 'manual-no-show',
        policyVersion: 1,
        policyDefaultRefundDestination: RefundDestination.CUSTOMER_WALLET,
        ruleId: 'manual-no-show',
        ruleCode: 'PRACTITIONER_NO_SHOW_REFUND',
        ruleDisplayName: 'Practitioner no-show wallet credit',
        cancellationAllowed: true,
        refundMode: SessionCancellationRefundMode.PERCENTAGE,
        refundPercent: '100.00',
        refundDestination: RefundDestination.CUSTOMER_WALLET,
        hoursBeforeStart: 0,
      },
      cancellationReason: 'PRACTITIONER_NO_SHOW_REFUND',
    });
    await this.applyCancellationFinancialEffects.postRefundLedgerIfNeeded(
      result.generatedRefundId,
      input.tx,
    );

    return {
      packageDecision: null,
      walletEffect: result.generatedRefundId ? 'PATIENT_WALLET_CREDIT' : 'NONE',
      earningEffect: 'NONE',
      refundId: result.generatedRefundId,
      refundAmount: result.refundAmount,
      idempotencyKey,
    };
  }
}
