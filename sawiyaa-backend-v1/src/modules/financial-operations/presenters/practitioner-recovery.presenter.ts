import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { buildPagination } from '../utils/pagination';
import {
  AdminPractitionerRecoveryActionItemDto,
  AdminPractitionerRecoveryDetailDataResponseDto,
  AdminPractitionerRecoveryDetailItemDto,
  AdminPractitionerRecoveryListDataResponseDto,
  AdminPractitionerRecoveryListItemDto,
  AdminPractitionerRecoveryPaymentSummaryDto,
  AdminPractitionerRecoveryPractitionerSummaryDto,
  AdminPractitionerRecoveryQueryBaseDto,
  AdminPractitionerRecoveryRefundSummaryDto,
  AdminPractitionerRecoverySettlementSummaryDto,
  AdminPractitionerRecoverySessionEarningReviewSummaryDto,
  AdminPractitionerRecoverySessionSummaryDto,
  AdminPractitionerRecoveryUserSummaryDto,
} from '../dto/admin-practitioner-recoveries.dto';

type RecoveryActionRow = {
  id: string;
  actionType: AdminPractitionerRecoveryActionItemDto['actionType'];
  amount: Prisma.Decimal;
  payoutId: string | null;
  reason: string | null;
  performedByUserId: string | null;
  createdAt: Date;
  performedByUser?: {
    id: string;
    displayName: string | null;
  } | null;
};

type RecoveryRow = {
  id: string;
  practitionerId: string;
  sessionId: string | null;
  paymentId: string | null;
  refundId: string;
  sessionEarningReviewId: string | null;
  settlementId: string | null;
  payoutId: string | null;
  amount: Prisma.Decimal;
  recoveredAmount: Prisma.Decimal;
  currencyCode: string;
  status: AdminPractitionerRecoveryListItemDto['status'];
  reasonCode: AdminPractitionerRecoveryListItemDto['reasonCode'];
  internalReason: string | null;
  practitionerFacingNote: string | null;
  createdByUserId: string | null;
  resolvedByUserId: string | null;
  resolvedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  practitioner: {
    id: string;
    publicSlug: string | null;
    professionalTitle: string | null;
    user: {
      displayName: string | null;
    } | null;
  };
  session: {
    id: string;
    sessionCode: string;
    status: AdminPractitionerRecoverySessionSummaryDto['status'];
    paymentCoverageType: AdminPractitionerRecoverySessionSummaryDto['paymentCoverageType'];
    scheduledStartAt: Date | null;
    scheduledEndAt: Date | null;
    completedAt: Date | null;
  } | null;
  payment: {
    id: string;
    status: AdminPractitionerRecoveryPaymentSummaryDto['status'];
    paymentPurpose: AdminPractitionerRecoveryPaymentSummaryDto['paymentPurpose'];
    provider: AdminPractitionerRecoveryPaymentSummaryDto['provider'];
    amountTotal: Prisma.Decimal;
    currencyCode: string;
    providerPaymentRef: string | null;
    providerOrderRef: string | null;
    initiatedAt: Date;
    capturedAt: Date | null;
    failedAt: Date | null;
    expiredAt: Date | null;
  } | null;
  refund: {
    id: string;
    status: AdminPractitionerRecoveryRefundSummaryDto['status'];
    amount: Prisma.Decimal;
    currencyCode: string;
    destination: AdminPractitionerRecoveryRefundSummaryDto['destination'];
    refundReason: string | null;
    providerRefundRef: string | null;
    requestedAt: Date;
    processedAt: Date | null;
    failedAt: Date | null;
  } | null;
  sessionEarningReview: {
    id: string;
    reviewStatus: AdminPractitionerRecoverySessionEarningReviewSummaryDto['reviewStatus'];
    reviewDecision: AdminPractitionerRecoverySessionEarningReviewSummaryDto['reviewDecision'];
    sourceType: AdminPractitionerRecoverySessionEarningReviewSummaryDto['sourceType'];
  } | null;
  settlement: {
    id: string;
    status: AdminPractitionerRecoverySettlementSummaryDto['status'];
    amountNet: Prisma.Decimal;
    amountPaidTotal: Prisma.Decimal;
    currencyCode: string;
  } | null;
  createdByUser: {
    id: string;
    displayName: string | null;
  } | null;
  resolvedByUser: {
    id: string;
    displayName: string | null;
  } | null;
  actions: RecoveryActionRow[];
};

@Injectable()
export class PractitionerRecoveryPresenter {
  presentList(
    items: AdminPractitionerRecoveryListItemDto[],
    page: number,
    limit: number,
    totalItems: number,
    filters: AdminPractitionerRecoveryQueryBaseDto,
  ): AdminPractitionerRecoveryListDataResponseDto {
    return {
      items,
      pagination: buildPagination({ page, limit, totalItems }),
      filters,
    };
  }

  presentDetail(item: AdminPractitionerRecoveryDetailItemDto): AdminPractitionerRecoveryDetailDataResponseDto {
    return { item };
  }

  presentListItem(recovery: RecoveryRow): AdminPractitionerRecoveryListItemDto {
    return {
      recoveryId: recovery.id,
      practitioner: this.presentPractitionerSummary(recovery.practitioner, recovery.practitionerId),
      session: recovery.session
        ? {
            sessionId: recovery.session.id,
            sessionCode: recovery.session.sessionCode,
            status: recovery.session.status,
            paymentCoverageType: recovery.session.paymentCoverageType,
            scheduledStartAt: recovery.session.scheduledStartAt?.toISOString() ?? null,
            scheduledEndAt: recovery.session.scheduledEndAt?.toISOString() ?? null,
            completedAt: recovery.session.completedAt?.toISOString() ?? null,
          }
        : null,
      payment: recovery.payment
        ? {
            paymentId: recovery.payment.id,
            status: recovery.payment.status,
            paymentPurpose: recovery.payment.paymentPurpose,
            provider: recovery.payment.provider,
            amountTotal: recovery.payment.amountTotal.toString(),
            currencyCode: recovery.payment.currencyCode,
            providerPaymentRef: recovery.payment.providerPaymentRef,
            providerOrderRef: recovery.payment.providerOrderRef,
            initiatedAt: recovery.payment.initiatedAt.toISOString(),
            capturedAt: recovery.payment.capturedAt?.toISOString() ?? null,
            failedAt: recovery.payment.failedAt?.toISOString() ?? null,
            expiredAt: recovery.payment.expiredAt?.toISOString() ?? null,
          }
        : null,
      refund: recovery.refund
        ? {
            refundId: recovery.refund.id,
            status: recovery.refund.status,
            amount: recovery.refund.amount.toString(),
            currencyCode: recovery.refund.currencyCode,
            destination: recovery.refund.destination,
            requestedAt: recovery.refund.requestedAt.toISOString(),
            processedAt: recovery.refund.processedAt?.toISOString() ?? null,
            failedAt: recovery.refund.failedAt?.toISOString() ?? null,
            providerRefundRef: recovery.refund.providerRefundRef,
          }
        : null,
      sessionEarningReview: recovery.sessionEarningReview
        ? {
            sessionEarningReviewId: recovery.sessionEarningReview.id,
            sourceType: recovery.sessionEarningReview.sourceType,
            reviewDecision: recovery.sessionEarningReview.reviewDecision,
            reviewStatus: recovery.sessionEarningReview.reviewStatus,
          }
        : null,
      settlement: recovery.settlement
        ? {
            settlementId: recovery.settlement.id,
            status: recovery.settlement.status,
            amountNet: recovery.settlement.amountNet.toString(),
            amountPaidTotal: recovery.settlement.amountPaidTotal.toString(),
            currencyCode: recovery.settlement.currencyCode,
          }
        : null,
      payoutId: recovery.payoutId,
      amount: recovery.amount.toString(),
      recoveredAmount: recovery.recoveredAmount.toString(),
      remainingAmount: this.getRemainingAmount(recovery).toString(),
      currencyCode: recovery.currencyCode,
      status: recovery.status,
      reasonCode: recovery.reasonCode,
      createdAt: recovery.createdAt.toISOString(),
      resolvedAt: recovery.resolvedAt?.toISOString() ?? null,
    };
  }

  presentDetailItem(recovery: RecoveryRow): AdminPractitionerRecoveryDetailItemDto {
    return {
      ...this.presentListItem(recovery),
      internalReason: recovery.internalReason,
      practitionerFacingNote: recovery.practitionerFacingNote,
      createdBy: this.presentUserSummary(recovery.createdByUser),
      resolvedBy: this.presentUserSummary(recovery.resolvedByUser),
      actionHistory: recovery.actions.map((action) => ({
        id: action.id,
        actionType: action.actionType,
        amount: action.amount.toString(),
        payoutId: action.payoutId,
        reason: action.reason,
        performedBy: this.presentUserSummary(action.performedByUser ?? null),
        createdAt: action.createdAt.toISOString(),
      })),
    };
  }

  private getRemainingAmount(recovery: Pick<RecoveryRow, 'amount' | 'recoveredAmount' | 'status'>) {
    const amount = new Prisma.Decimal(recovery.amount);
    const recovered = new Prisma.Decimal(recovery.recoveredAmount);
    if (recovery.status === 'WAIVED') {
      return new Prisma.Decimal(0);
    }

    const remaining = amount.sub(recovered);
    return remaining.gt(0) ? remaining : new Prisma.Decimal(0);
  }

  private presentUserSummary(
    user: RecoveryRow['createdByUser'] | RecoveryRow['resolvedByUser'] | RecoveryActionRow['performedByUser'],
  ): AdminPractitionerRecoveryUserSummaryDto | null {
    if (!user) {
      return null;
    }

    return {
      userId: user.id,
      displayName: user.displayName ?? null,
    };
  }

  private presentPractitionerSummary(
    practitioner: RecoveryRow['practitioner'],
    practitionerId: string,
  ): AdminPractitionerRecoveryPractitionerSummaryDto {
    return {
      practitionerId,
      displayName: practitioner.user?.displayName ?? null,
      publicSlug: practitioner.publicSlug ?? null,
      professionalTitle: practitioner.professionalTitle ?? null,
    };
  }
}
