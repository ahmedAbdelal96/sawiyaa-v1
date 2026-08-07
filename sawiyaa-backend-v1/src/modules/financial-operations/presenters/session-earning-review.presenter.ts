import { Injectable } from '@nestjs/common';
import { Prisma, PractitionerSettlementStatus } from '@prisma/client';
import {
  AdminSessionEarningReviewDetailItemDto,
  AdminSessionEarningReviewListDataResponseDto,
  AdminSessionEarningReviewListItemDto,
  AdminSessionEarningReviewDetailDataResponseDto,
  SessionEarningReviewPackagePurchaseSummaryDto,
  SessionEarningReviewPackageSettlementSummaryDto,
  SessionEarningReviewLedgerEntryDto,
  SessionEarningReviewPatientSummaryDto,
  SessionEarningReviewPaymentSummaryDto,
  SessionEarningReviewPractitionerSummaryDto,
  SessionEarningReviewRefundSummaryDto,
  SessionEarningReviewSessionSummaryDto,
  SessionEarningReviewUserSummaryDto,
  SessionEarningReviewAdjustmentDto,
} from '../dto/admin-session-earning-reviews.dto';
import { SessionEarningReviewFinancialStage } from '../dto/admin-session-earning-reviews.dto';
import { buildPagination } from '../utils/pagination';

export type SessionEarningReviewListRow = {
  id: string;
  sessionId: string;
  earningEntitlementId: string;
  paymentId: string | null;
  packagePurchaseId: string | null;
  packageSettlementId: string | null;
  settlementId: string | null;
  settlement: { status: PractitionerSettlementStatus } | null;
  practitionerId: string;
  patientId: string;
  sourceType: AdminSessionEarningReviewListItemDto['sourceType'];
  reviewStatus: AdminSessionEarningReviewListItemDto['reviewStatus'];
  reviewDecision: AdminSessionEarningReviewListItemDto['reviewDecision'];
  paymentAmount: Prisma.Decimal;
  paymentCurrencyCode: string;
  suggestedPractitionerAmount: Prisma.Decimal;
  suggestedPlatformAmount: Prisma.Decimal;
  suggestedCurrencyCode: string;
  suggestedPractitionerPercentage: Prisma.Decimal | null;
  accountantApprovedSourceAmount: Prisma.Decimal | null;
  accountingAdjustmentAmount: Prisma.Decimal | null;
  accountingAdjustmentType: string | null;
  accountingAdjustmentReason: string | null;
  accountingNotes: string | null;
  finalPractitionerAmount: Prisma.Decimal | null;
  finalPlatformAmount: Prisma.Decimal | null;
  finalCurrencyCode: string | null;
  reviewedByUserId: string | null;
  reviewedAt: Date | null;
  approvedByUserId: string | null;
  approvedAt: Date | null;
  patientCountrySnapshot?: string | null;
  practitionerCountrySnapshot?: string | null;
  countryRelationshipSnapshot?: string | null;
  calculatedPractitionerAmount?: Prisma.Decimal | null;
  overrideReason?: string | null;
  internalReason: string | null;
  practitionerFacingNote: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type SessionEarningReviewSessionRow = {
  id: string;
  sessionCode: string | null;
  status: SessionEarningReviewSessionSummaryDto['status'];
  paymentCoverageType: SessionEarningReviewSessionSummaryDto['paymentCoverageType'];
  scheduledStartAt: Date | null;
  scheduledEndAt: Date | null;
  completedAt: Date | null;
  packagePurchaseId: string | null;
  packageSessionIndex: number | null;
  packageSessionCount: number | null;
  originalSessionId: string | null;
  patient: {
    id: string;
    displayName: string | null;
    user: {
      displayName: string | null;
    } | null;
  };
  practitioner: {
    id: string;
    publicSlug: string;
    professionalTitle: string | null;
    user: {
      displayName: string | null;
    } | null;
  };
};

export type SessionEarningReviewPaymentRow = {
  id: string;
  status: SessionEarningReviewPaymentSummaryDto['status'];
  paymentPurpose: SessionEarningReviewPaymentSummaryDto['paymentPurpose'];
  provider: SessionEarningReviewPaymentSummaryDto['provider'];
  amountTotal: Prisma.Decimal;
  currencyCode: string;
  providerPaymentRef: string | null;
  providerOrderRef: string | null;
  initiatedAt: Date;
  capturedAt: Date | null;
  failedAt: Date | null;
  expiredAt: Date | null;
};

export type SessionEarningReviewRefundRow = {
  id: string;
  status: SessionEarningReviewRefundSummaryDto['status'];
  destination: SessionEarningReviewRefundSummaryDto['destination'];
  refundReason: string | null;
  amount: Prisma.Decimal;
  currencyCode: string;
  providerRefundRef: string | null;
  requestedAt: Date;
  processedAt: Date | null;
  failedAt: Date | null;
};

export type SessionEarningReviewLedgerRow = {
  id: string;
  entryType: SessionEarningReviewLedgerEntryDto['entryType'];
  direction: SessionEarningReviewLedgerEntryDto['direction'];
  amount: Prisma.Decimal;
  currencyCode: string;
  balanceBucket: SessionEarningReviewLedgerEntryDto['balanceBucket'];
  referenceType: string | null;
  referenceId: string | null;
  createdAt: Date;
};

export type SessionEarningReviewPackagePurchaseRow = {
  id: string;
  status: SessionEarningReviewPackagePurchaseSummaryDto['status'];
  titleSnapshot: string;
  slugSnapshot: string;
  sessionCountSnapshot: number;
  selectedCurrencyCode: string;
  patientPayableTotalSnapshot: Prisma.Decimal | null;
  practitionerFinalShareSnapshot: Prisma.Decimal | null;
  platformFinalShareSnapshot: Prisma.Decimal | null;
  paymentId: string | null;
  packageSettlement: { id: string } | null;
};

export type SessionEarningReviewPackageSettlementRow = {
  id: string;
  status: SessionEarningReviewPackageSettlementSummaryDto['status'];
  currencyCode: string;
  sessionCount: number;
  completedSessionsCount: number;
  heldPractitionerAmount: Prisma.Decimal;
  heldPlatformAmount: Prisma.Decimal;
  releasablePractitionerAmount: Prisma.Decimal;
  releasedPractitionerAmount: Prisma.Decimal;
  normalEquivalentUsedAmount: Prisma.Decimal;
  discountAppliedAmount: Prisma.Decimal;
  reviewedAt: Date | null;
  releasedAt: Date | null;
  decision: string | null;
  notes: string | null;
};

export type SessionEarningReviewUserRow = {
  id: string;
  displayName: string | null;
};

export type SessionEarningReviewAdjustmentRow = {
  id: string;
  type: SessionEarningReviewAdjustmentDto['type'];
  category: string;
  description: string;
  amount: Prisma.Decimal;
  currencyCode: string;
  reason: string;
  createdByUserId: string;
  createdAt: Date;
  createdByUser: { id: string; displayName: string | null } | null;
};

@Injectable()
export class SessionEarningReviewPresenter {
  presentList(input: {
    items: AdminSessionEarningReviewListItemDto[];
    page: number;
    limit: number;
    totalItems: number;
    filters: Record<string, string | boolean | null>;
  }): AdminSessionEarningReviewListDataResponseDto {
    return {
      items: input.items,
      pagination: buildPagination({
        page: input.page,
        limit: input.limit,
        totalItems: input.totalItems,
      }),
      filters: input.filters,
    };
  }

  presentDetail(
    item: AdminSessionEarningReviewDetailItemDto,
  ): AdminSessionEarningReviewDetailDataResponseDto {
    return {
      item,
    };
  }

  presentListItem(input: {
    review: SessionEarningReviewListRow;
    practitioner: SessionEarningReviewPractitionerSummaryDto;
    patient: SessionEarningReviewPatientSummaryDto;
    session: SessionEarningReviewSessionSummaryDto;
    payment: SessionEarningReviewPaymentSummaryDto | null;
    packagePurchase: SessionEarningReviewPackagePurchaseSummaryDto | null;
    packageSettlement: SessionEarningReviewPackageSettlementSummaryDto | null;
    reviewedBy: SessionEarningReviewUserSummaryDto | null;
    approvedBy: SessionEarningReviewUserSummaryDto | null;
    activeWalletCurrency?: string | null;
  }): AdminSessionEarningReviewListItemDto {
    const isActionRequired =
      input.review.reviewStatus === 'PENDING_REVIEW';
    const isFinalized = !isActionRequired;
    const financialStage = input.review.reviewStatus === 'PENDING_REVIEW'
      ? SessionEarningReviewFinancialStage.PENDING_REVIEW
      : input.review.reviewStatus === 'DECISION_APPROVED'
        ? SessionEarningReviewFinancialStage.DECISION_APPROVED
        : input.review.reviewStatus === 'REJECTED' || input.review.reviewStatus === 'EXCLUDED_FROM_PAYOUT'
          ? SessionEarningReviewFinancialStage.REJECTED_OR_EXCLUDED
          : input.review.settlement?.status === PractitionerSettlementStatus.PAID_OUT || input.review.settlement?.status === PractitionerSettlementStatus.PAID
            ? SessionEarningReviewFinancialStage.EXTERNAL_PAYOUT
            : SessionEarningReviewFinancialStage.WALLET_CREDITED;

    return {
      reviewId: input.review.id,
      earningEntitlementId: input.review.earningEntitlementId,
      fulfillmentSessionId: input.review.sessionId,
      originalSessionId: input.session.originalSessionId,
      sourceType: input.review.sourceType,
      reviewStatus: input.review.reviewStatus,
      financialStage,
      reviewDecision: input.review.reviewDecision,
      paymentAmount: this.decimalToString(input.review.paymentAmount),
      paymentCurrencyCode: input.review.paymentCurrencyCode,
      suggestedPractitionerAmount: this.decimalToString(
        input.review.suggestedPractitionerAmount,
      ),
      suggestedPlatformAmount: this.decimalToString(
        input.review.suggestedPlatformAmount,
      ),
      suggestedCurrencyCode: input.review.suggestedCurrencyCode,
      suggestedPractitionerPercentage: this.optionalDecimalToString(input.review.suggestedPractitionerPercentage),
      accountantApprovedSourceAmount: this.optionalDecimalToString(input.review.accountantApprovedSourceAmount),
      accountingAdjustmentAmount: this.optionalDecimalToString(input.review.accountingAdjustmentAmount),
      accountingAdjustmentType: input.review.accountingAdjustmentType,
      accountingAdjustmentReason: input.review.accountingAdjustmentReason,
      accountingNotes: input.review.accountingNotes,
      finalPractitionerAmount: this.optionalDecimalToString(
        input.review.finalPractitionerAmount,
      ),
      finalPlatformAmount: this.optionalDecimalToString(
        input.review.finalPlatformAmount,
      ),
      finalCurrencyCode: input.review.finalCurrencyCode,
      patientCountrySnapshot: input.review.patientCountrySnapshot ?? null,
      practitionerCountrySnapshot: input.review.practitionerCountrySnapshot ?? null,
      countryRelationshipSnapshot: input.review.countryRelationshipSnapshot ?? null,
      calculatedPractitionerAmount: this.optionalDecimalToString(input.review.calculatedPractitionerAmount ?? null),
      overrideReason: input.review.overrideReason ?? null,
      reviewedAt: input.review.reviewedAt?.toISOString() ?? null,
      approvedAt: input.review.approvedAt?.toISOString() ?? null,
      reviewedBy: input.reviewedBy,
      approvedBy: input.approvedBy,
      practitioner: input.practitioner,
      patient: input.patient,
      session: input.session,
      payment: input.payment,
      packagePurchase: input.packagePurchase,
      packageSettlement: input.packageSettlement,
      activeWalletCurrency: input.activeWalletCurrency ?? null,
      conversionRequired: Boolean(input.activeWalletCurrency && input.activeWalletCurrency !== input.review.paymentCurrencyCode),
      isActionRequired,
      isFinalized,
      canApprove: isActionRequired,
      canAdjust: isActionRequired,
      canReject: isActionRequired,
      createdAt: input.review.createdAt.toISOString(),
      updatedAt: input.review.updatedAt.toISOString(),
    };
  }

  presentDetailItem(input: {
    review: SessionEarningReviewListRow;
    practitioner: SessionEarningReviewPractitionerSummaryDto;
    patient: SessionEarningReviewPatientSummaryDto;
    session: SessionEarningReviewSessionSummaryDto;
    payment: SessionEarningReviewPaymentSummaryDto | null;
    packagePurchase: SessionEarningReviewPackagePurchaseSummaryDto | null;
    packageSettlement: SessionEarningReviewPackageSettlementSummaryDto | null;
    reviewedBy: SessionEarningReviewUserSummaryDto | null;
    approvedBy: SessionEarningReviewUserSummaryDto | null;
    ledgerEntries: SessionEarningReviewLedgerRow[];
    adjustments: SessionEarningReviewAdjustmentRow[];
    activeWalletCurrency?: string | null;
  }): AdminSessionEarningReviewDetailItemDto {
    return {
      ...this.presentListItem(input),
      internalReason: input.review.internalReason,
      practitionerFacingNote: input.review.practitionerFacingNote,
      ledgerEntries: (input.ledgerEntries ?? []).map((entry) => ({
        id: entry.id,
        entryType: entry.entryType,
        direction: entry.direction,
        amount: entry.amount.toString(),
        currencyCode: entry.currencyCode,
        balanceBucket: entry.balanceBucket,
        referenceType: entry.referenceType,
        referenceId: entry.referenceId,
        createdAt: entry.createdAt.toISOString(),
      })),
      adjustments: (input.adjustments ?? []).map((adjustment) => ({
        id: adjustment.id,
        type: adjustment.type,
        category: adjustment.category,
        description: adjustment.description,
        amount: adjustment.amount.toString(),
        currencyCode: adjustment.currencyCode,
        reason: adjustment.reason,
        createdBy: adjustment.createdByUser
          ? { userId: adjustment.createdByUser.id, displayName: adjustment.createdByUser.displayName }
          : null,
        createdAt: adjustment.createdAt.toISOString(),
      })),
    };
  }

  presentReviewUserSummary(user: SessionEarningReviewUserRow | null) {
    if (!user) {
      return null;
    }

    return {
      userId: user.id,
      displayName: user.displayName ?? null,
    };
  }

  presentPaymentSummary(input: {
    payment: SessionEarningReviewPaymentRow | null;
    refundedAmount: Prisma.Decimal | null;
    refunds: SessionEarningReviewRefundRow[];
    reversalLedgerEntries: SessionEarningReviewLedgerRow[] | null;
  }): SessionEarningReviewPaymentSummaryDto | null {
    if (!input.payment) {
      return null;
    }

    const refundedAmount = input.refundedAmount ?? new Prisma.Decimal(0);
    const remainingEffectiveAmount = input.payment.amountTotal.sub(
      refundedAmount,
    );

    return {
      paymentId: input.payment.id,
      status: input.payment.status,
      paymentPurpose: input.payment.paymentPurpose,
      provider: input.payment.provider,
      currencyCode: input.payment.currencyCode,
      amountTotal: input.payment.amountTotal.toString(),
      refundedAmount: refundedAmount.toString(),
      remainingEffectiveAmount: remainingEffectiveAmount.toString(),
      providerPaymentRef: input.payment.providerPaymentRef,
      providerOrderRef: input.payment.providerOrderRef,
      initiatedAt: input.payment.initiatedAt.toISOString(),
      capturedAt: input.payment.capturedAt?.toISOString() ?? null,
      failedAt: input.payment.failedAt?.toISOString() ?? null,
      expiredAt: input.payment.expiredAt?.toISOString() ?? null,
      refunds: input.refunds.map((refund) => ({
        id: refund.id,
        status: refund.status,
        amount: refund.amount.toString(),
        currencyCode: refund.currencyCode,
        requestedAt: refund.requestedAt.toISOString(),
        processedAt: refund.processedAt?.toISOString() ?? null,
        failedAt: refund.failedAt?.toISOString() ?? null,
        destination: refund.destination,
        refundReason: refund.refundReason,
        providerRefundRef: refund.providerRefundRef,
      })),
      reversalLedgerEntries: input.reversalLedgerEntries
        ? input.reversalLedgerEntries.map((entry) => ({
            id: entry.id,
            entryType: entry.entryType,
            direction: entry.direction,
            amount: entry.amount.toString(),
            currencyCode: entry.currencyCode,
            balanceBucket: entry.balanceBucket,
            referenceType: entry.referenceType,
            referenceId: entry.referenceId,
            createdAt: entry.createdAt.toISOString(),
          }))
        : null,
    };
  }

  presentPackagePurchaseSummary(
    purchase: SessionEarningReviewPackagePurchaseRow | null,
  ): SessionEarningReviewPackagePurchaseSummaryDto | null {
    if (!purchase) {
      return null;
    }

    return {
      packagePurchaseId: purchase.id,
      status: purchase.status,
      titleSnapshot: purchase.titleSnapshot,
      slugSnapshot: purchase.slugSnapshot,
      sessionCountSnapshot: purchase.sessionCountSnapshot,
      selectedCurrencyCode: purchase.selectedCurrencyCode,
      patientPayableTotalSnapshot:
        purchase.patientPayableTotalSnapshot?.toString() ?? null,
      practitionerFinalShareSnapshot:
        purchase.practitionerFinalShareSnapshot?.toString() ?? null,
      platformFinalShareSnapshot:
        purchase.platformFinalShareSnapshot?.toString() ?? null,
      paymentId: purchase.paymentId,
      packageSettlementId: purchase.packageSettlement?.id ?? null,
    };
  }

  presentPackageSettlementSummary(
    settlement: SessionEarningReviewPackageSettlementRow | null,
  ): SessionEarningReviewPackageSettlementSummaryDto | null {
    if (!settlement) {
      return null;
    }

    return {
      packageSettlementId: settlement.id,
      status: settlement.status,
      currencyCode: settlement.currencyCode,
      sessionCount: settlement.sessionCount,
      completedSessionsCount: settlement.completedSessionsCount,
      heldPractitionerAmount: settlement.heldPractitionerAmount.toString(),
      heldPlatformAmount: settlement.heldPlatformAmount.toString(),
      releasablePractitionerAmount:
        settlement.releasablePractitionerAmount.toString(),
      releasedPractitionerAmount:
        settlement.releasedPractitionerAmount.toString(),
      normalEquivalentUsedAmount:
        settlement.normalEquivalentUsedAmount.toString(),
      discountAppliedAmount: settlement.discountAppliedAmount.toString(),
      reviewedAt: settlement.reviewedAt?.toISOString() ?? null,
      releasedAt: settlement.releasedAt?.toISOString() ?? null,
      decision: settlement.decision,
      notes: settlement.notes,
    };
  }

  presentSessionSummary(session: SessionEarningReviewSessionRow): SessionEarningReviewSessionSummaryDto {
    return {
      sessionId: session.id,
      originalSessionId: session.originalSessionId ?? null,
      sessionCode: session.sessionCode,
      status: session.status,
      paymentCoverageType: session.paymentCoverageType,
      scheduledStartAt: session.scheduledStartAt?.toISOString() ?? null,
      scheduledEndAt: session.scheduledEndAt?.toISOString() ?? null,
      completedAt: session.completedAt?.toISOString() ?? null,
      packagePurchaseId: session.packagePurchaseId ?? null,
      packageSessionIndex: session.packageSessionIndex ?? null,
      packageSessionCount: session.packageSessionCount ?? null,
    };
  }

  presentPractitionerSummary(session: SessionEarningReviewSessionRow): SessionEarningReviewPractitionerSummaryDto {
    return {
      practitionerId: session.practitioner.id,
      displayName: session.practitioner.user?.displayName ?? null,
      publicSlug: session.practitioner.publicSlug,
      professionalTitle: session.practitioner.professionalTitle,
    };
  }

  presentPatientSummary(session: SessionEarningReviewSessionRow): SessionEarningReviewPatientSummaryDto {
    return {
      patientId: session.patient.id,
      displayName: session.patient.displayName ?? session.patient.user?.displayName ?? null,
    };
  }

  private decimalToString(value: Prisma.Decimal) {
    return value.toString();
  }

  private optionalDecimalToString(value: Prisma.Decimal | null) {
    return value ? value.toString() : null;
  }
}
