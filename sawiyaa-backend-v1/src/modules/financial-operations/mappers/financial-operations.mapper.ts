import { Injectable } from '@nestjs/common';
import {
  LedgerEntry,
  PackageSettlement,
  PractitionerManualPayout,
  PractitionerSettlement,
  PractitionerSettlementPayout,
  PractitionerSettlementPayoutProof,
  Prisma,
  SettlementBatch,
} from '@prisma/client';
import {
  LedgerEntryViewModel,
  AdminPayoutHistoryViewModel,
  PractitionerPayoutDetailViewModel,
  PractitionerPayoutDueSummaryViewModel,
  PractitionerPayoutDueViewModel,
  PractitionerPayoutHistoryViewModel,
  PackageSettlementViewModel,
  PractitionerManualPayoutViewModel,
  PractitionerManualPayoutSummaryViewModel,
  PractitionerPayoutDestinationSnapshotViewModel,
  PractitionerPayoutBalanceViewModel,
  PractitionerStatementRowViewModel,
  PractitionerSettlementViewModel,
  SettlementPayoutProofViewModel,
  SettlementPayoutViewModel,
  SettlementBatchDetailsViewModel,
  SettlementBatchListItemViewModel,
  WalletViewModel,
} from '../types/financial-operations.types';

type BatchWithSettlements = SettlementBatch & {
  settlements: Array<
    PractitionerSettlement & {
      batch?: {
        id: string;
        slug: string;
        periodYear: number;
        periodMonth: number;
        currencyCode: string;
        status: SettlementBatch['status'];
      };
    }
  >;
};

type PractitionerSettlementWithBatch = PractitionerSettlement & {
  batch?: {
    id: string;
    slug: string;
    periodYear: number;
    periodMonth: number;
    currencyCode: string;
    status: SettlementBatch['status'];
  };
};

type SettlementPayoutWithRelations = PractitionerSettlementPayout & {
  batch?: {
    id: string;
    slug: string;
    periodYear: number;
    periodMonth: number;
    currencyCode: string;
    status: SettlementBatch['status'];
  };
  proof?: SettlementPayoutProofWithPayout | null;
  settlement?: {
    id: string;
    status: PractitionerSettlement['status'];
    amountGross: Prisma.Decimal;
    amountAdjustments: Prisma.Decimal;
    amountNet: Prisma.Decimal;
    amountPaidTotal: Prisma.Decimal;
    currencyCode: string;
    practitionerId: string;
    paidAt: Date | null;
    failedAt: Date | null;
    notes: string | null;
    createdAt: Date;
  };
  processedByUser?: {
    id: string;
    displayName: string | null;
  } | null;
  practitioner?: {
    id: string;
    publicSlug: string;
    user?: {
      displayName: string | null;
    } | null;
  } | null;
};

type SettlementPayoutProofWithPayout = PractitionerSettlementPayoutProof & {
  payout: {
    practitionerId: string;
  };
};

type PractitionerDueSnapshot = {
  id: string;
  practitionerId: string;
  status: PractitionerSettlement['status'];
  currencyCode: string;
  amountGross: Prisma.Decimal;
  amountAdjustments: Prisma.Decimal;
  amountNet: Prisma.Decimal;
  amountPaidTotal: Prisma.Decimal;
  externalPayoutRef?: string | null;
  paidAt: Date | null;
  failedAt: Date | null;
  notes: string | null;
  createdAt: Date;
};

type PackageSettlementWithRelations = PackageSettlement & {
  purchase?: {
    id: string;
    status: string;
    planCodeSnapshot: string | null;
    titleSnapshot: string;
    paymentId: string | null;
    packagePlan?: {
      code: string;
      title: string;
    } | null;
    payment?: {
      status: string;
    } | null;
  } | null;
  practitioner?: {
    id: string;
    publicSlug: string;
    user?: {
      displayName: string | null;
    } | null;
  } | null;
  patient?: {
    id: string;
    user?: {
      displayName: string | null;
    } | null;
  } | null;
};

type PractitionerManualPayoutWithRelations = PractitionerManualPayout & {
  practitioner?: {
    id: string;
    publicSlug: string;
    user?: {
      displayName: string | null;
    } | null;
  } | null;
  recordedByUser?: {
    id: string;
    displayName: string | null;
  } | null;
};

@Injectable()
export class FinancialOperationsMapper {
  toWallet(input: {
    currency: string;
    pendingBalance: string;
    availableBalance: string;
    reservedBalance: string;
    totalEarned: string;
    lifetimePaidOut: string;
    manualRecoveryAmount: string;
    lastLedgerEntryAt: string | null;
    updatedAt: string | null;
  }): WalletViewModel {
    return input;
  }

  toLedgerEntry(entry: LedgerEntry): LedgerEntryViewModel {
    return {
      id: entry.id,
      entryType: entry.entryType,
      direction: entry.direction,
      amount: entry.amount.toString(),
      currency: entry.currencyCode,
      balanceBucket: entry.balanceBucket,
      paymentId: entry.paymentId ?? null,
      sessionId: entry.sessionId ?? null,
      settlementId: entry.settlementId ?? null,
      referenceType: entry.referenceType ?? null,
      referenceId: entry.referenceId ?? null,
      description: entry.description ?? null,
      createdAt: entry.createdAt.toISOString(),
      effectiveAt: entry.effectiveAt.toISOString(),
    };
  }

  toPractitionerSettlement(
    settlement: PractitionerSettlementWithBatch,
  ): PractitionerSettlementViewModel {
    return {
      id: settlement.id,
      batchId: settlement.batchId,
      batchSlug: settlement.batch?.slug ?? '',
      batchPeriodYear: settlement.batch?.periodYear ?? 0,
      batchPeriodMonth: settlement.batch?.periodMonth ?? 0,
      batchStatus: settlement.batch?.status ?? 'DRAFT',
      practitionerId: settlement.practitionerId,
      status: settlement.status,
      currency: settlement.currencyCode,
      amountGross: settlement.amountGross.toString(),
      amountAdjustments: settlement.amountAdjustments.toString(),
      amountNet: settlement.amountNet.toString(),
      payoutMethodSnapshot:
        (settlement.payoutMethodSnapshot as Record<string, unknown> | null) ??
        null,
      externalPayoutRef: settlement.externalPayoutRef ?? null,
      paidAt: settlement.paidAt?.toISOString() ?? null,
      failedAt: settlement.failedAt?.toISOString() ?? null,
      notes: settlement.notes ?? null,
      createdAt: settlement.createdAt.toISOString(),
    };
  }

  toSettlementPayout(
    payout: SettlementPayoutWithRelations,
  ): SettlementPayoutViewModel {
    return {
      id: payout.id,
      batchId: payout.batchId,
      batchSlug: payout.batch?.slug ?? '',
      batchPeriodYear: payout.batch?.periodYear ?? 0,
      batchPeriodMonth: payout.batch?.periodMonth ?? 0,
      batchStatus: payout.batch?.status ?? 'DRAFT',
      settlementId: payout.settlementId,
      practitionerId: payout.practitionerId,
      amountNet: payout.amountPaid.toString(),
      currency: payout.currencyCode,
      payoutMethod: payout.payoutMethod,
      payoutSource: payout.payoutSource,
      externalPayoutRef: payout.externalPayoutRef ?? null,
      notes: payout.notes ?? null,
      effectiveAt: payout.effectiveAt.toISOString(),
      processedByUserId: payout.processedByUserId ?? null,
      processedByDisplayName: payout.processedByUser?.displayName ?? null,
      proof: payout.proof ? this.toSettlementPayoutProof(payout.proof) : null,
      createdAt: payout.createdAt.toISOString(),
    };
  }

  toPractitionerStatementLedgerRow(
    entry: LedgerEntry,
  ): PractitionerStatementRowViewModel {
    return {
      id: entry.id,
      rowType: 'EARNING',
      sourceType: 'LEDGER',
      effectiveAt: entry.effectiveAt.toISOString(),
      createdAt: entry.createdAt.toISOString(),
      currency: entry.currencyCode,
      amount: entry.amount.toString(),
      paymentId: entry.paymentId ?? null,
      sessionId: entry.sessionId ?? null,
      settlementId: entry.settlementId ?? null,
      referenceType: entry.referenceType ?? null,
      referenceId: entry.referenceId ?? null,
      description: entry.description ?? null,
      payoutMethod: null,
      payoutSource: null,
      externalReference: entry.referenceId ?? entry.paymentId ?? null,
      notes: null,
      processedByUserId: null,
      processedByDisplayName: null,
      proofPresent: false,
    };
  }

  toPractitionerStatementPayoutRow(
    payout: SettlementPayoutWithRelations,
  ): PractitionerStatementRowViewModel {
    return {
      id: payout.id,
      rowType: 'PAYOUT',
      sourceType: 'PAYOUT',
      effectiveAt: payout.effectiveAt.toISOString(),
      createdAt: payout.createdAt.toISOString(),
      currency: payout.currencyCode,
      amount: payout.amountPaid.toString(),
      paymentId: null,
      sessionId: null,
      settlementId: payout.settlementId,
      referenceType: 'settlement_payout',
      referenceId: payout.id,
      description: 'Practitioner payout.',
      payoutMethod: payout.payoutMethod,
      payoutSource: payout.payoutSource,
      externalReference: payout.externalPayoutRef ?? null,
      notes: payout.notes ?? null,
      processedByUserId: payout.processedByUserId ?? null,
      processedByDisplayName: payout.processedByUser?.displayName ?? null,
      proofPresent: Boolean(payout.proof),
    };
  }

  toSettlementPayoutProof(
    proof: SettlementPayoutProofWithPayout,
  ): SettlementPayoutProofViewModel {
    return {
      id: proof.id,
      fileName: proof.storedFileName,
      mimeType: proof.mimeType,
      fileSizeBytes: proof.fileSizeBytes,
      originalFileName: proof.originalFileName ?? null,
      uploadedAt: proof.uploadedAt.toISOString(),
      downloadUrl: `/api/v1/admin/practitioners/${proof.payout.practitionerId}/payouts/${proof.payoutId}/proof`,
    };
  }

  toPractitionerPayoutDue(
    settlement: PractitionerSettlement,
  ): PractitionerPayoutDueViewModel {
    const paidTotal = settlement.amountPaidTotal ?? new Prisma.Decimal(0);
    const remainingRaw = settlement.amountNet.sub(paidTotal);
    const remaining = remainingRaw.isNegative()
      ? new Prisma.Decimal(0)
      : remainingRaw;

    return {
      id: settlement.id,
      practitionerId: settlement.practitionerId,
      status: settlement.status,
      currency: settlement.currencyCode,
      amountGross: settlement.amountGross.toString(),
      amountAdjustments: settlement.amountAdjustments.toString(),
      amountNet: settlement.amountNet.toString(),
      amountPaidTotal: paidTotal.toString(),
      amountRemaining: remaining.toString(),
      externalPayoutRef: settlement.externalPayoutRef ?? null,
      paidAt: settlement.paidAt?.toISOString() ?? null,
      failedAt: settlement.failedAt?.toISOString() ?? null,
      notes: settlement.notes ?? null,
      createdAt: settlement.createdAt.toISOString(),
    };
  }

  toPractitionerPayoutDueSummary(input: {
    currency: string;
    dueCount: number;
    dueAmountNet: Prisma.Decimal | string;
    lastDueAt: Date | null;
    walletAvailableBalance?: Prisma.Decimal | string | null;
    walletReservedBalance?: Prisma.Decimal | string | null;
    walletPendingBalance?: Prisma.Decimal | string | null;
    walletUpdatedAt?: Date | null;
  }): PractitionerPayoutDueSummaryViewModel {
    return {
      currency: input.currency,
      dueCount: input.dueCount,
      dueAmountNet: input.dueAmountNet.toString(),
      lastDueAt: input.lastDueAt?.toISOString() ?? null,
      walletAvailableBalance: input.walletAvailableBalance?.toString() ?? null,
      walletReservedBalance: input.walletReservedBalance?.toString() ?? null,
      walletPendingBalance: input.walletPendingBalance?.toString() ?? null,
      walletUpdatedAt: input.walletUpdatedAt?.toISOString() ?? null,
    };
  }

  toPractitionerPayoutHistory(
    payout: SettlementPayoutWithRelations,
  ): PractitionerPayoutHistoryViewModel {
    return {
      id: payout.id,
      practitionerId: payout.practitionerId,
      settlementId: payout.settlementId,
      amountPaid: payout.amountPaid.toString(),
      currency: payout.currencyCode,
      payoutMethod: payout.payoutMethod,
      payoutSource: payout.payoutSource,
      payoutDate: payout.effectiveAt.toISOString(),
      externalReference: payout.externalPayoutRef ?? null,
      notes: payout.notes ?? null,
      processedByUserId: payout.processedByUserId ?? null,
      processedByDisplayName: payout.processedByUser?.displayName ?? null,
      proof: payout.proof ? this.toSettlementPayoutProof(payout.proof) : null,
      createdAt: payout.createdAt.toISOString(),
    };
  }

  toAdminPayoutHistory(
    payout: SettlementPayoutWithRelations,
  ): AdminPayoutHistoryViewModel {
    return {
      ...this.toPractitionerPayoutHistory(payout),
      practitionerDisplayName: payout.practitioner?.user?.displayName ?? null,
      practitionerSlug: payout.practitioner?.publicSlug ?? null,
    };
  }

  toPractitionerPayoutDetail(
    payout: SettlementPayoutWithRelations,
  ): PractitionerPayoutDetailViewModel {
    return {
      ...this.toPractitionerPayoutHistory(payout),
      settlement: this.toPractitionerDueSnapshot(
        payout.settlement ?? {
          id: payout.settlementId,
          status: 'DRAFT',
          currencyCode: payout.currencyCode,
          amountGross: payout.amountPaid,
          amountAdjustments: new Prisma.Decimal(0),
          amountNet: payout.amountPaid,
          amountPaidTotal: payout.amountPaid,
          practitionerId: payout.practitionerId,
          externalPayoutRef: payout.externalPayoutRef,
          paidAt: null,
          failedAt: null,
          notes: payout.notes,
          createdAt: payout.createdAt,
        },
      ),
    };
  }

  private toPractitionerDueSnapshot(
    settlement: PractitionerDueSnapshot,
  ): PractitionerPayoutDueViewModel {
    const paidTotal = settlement.amountPaidTotal ?? new Prisma.Decimal(0);
    const remainingRaw = settlement.amountNet.sub(paidTotal);
    const remaining = remainingRaw.isNegative()
      ? new Prisma.Decimal(0)
      : remainingRaw;

    return {
      id: settlement.id,
      practitionerId: settlement.practitionerId,
      status: settlement.status,
      currency: settlement.currencyCode,
      amountGross: settlement.amountGross.toString(),
      amountAdjustments: settlement.amountAdjustments.toString(),
      amountNet: settlement.amountNet.toString(),
      amountPaidTotal: paidTotal.toString(),
      amountRemaining: remaining.toString(),
      externalPayoutRef: settlement.externalPayoutRef ?? null,
      paidAt: settlement.paidAt?.toISOString() ?? null,
      failedAt: settlement.failedAt?.toISOString() ?? null,
      notes: settlement.notes ?? null,
      createdAt: settlement.createdAt.toISOString(),
    };
  }

  toSettlementBatchListItem(
    batch: BatchWithSettlements,
  ): SettlementBatchListItemViewModel {
    const totalAmount = batch.settlements.reduce(
      (sum, settlement) => sum.add(settlement.amountNet),
      new Prisma.Decimal(0),
    );

    return {
      id: batch.id,
      slug: batch.slug,
      status: batch.status,
      currency: batch.currencyCode,
      periodYear: batch.periodYear,
      periodMonth: batch.periodMonth,
      totalAmount: totalAmount.toString(),
      settlementItemsCount: batch.settlements.length,
      generatedAt: batch.generatedAt?.toISOString() ?? null,
      finalizedAt: batch.finalizedAt?.toISOString() ?? null,
      createdAt: batch.createdAt.toISOString(),
    };
  }

  toSettlementBatchDetails(
    batch: BatchWithSettlements,
  ): SettlementBatchDetailsViewModel {
    const totals = batch.settlements.reduce(
      (acc, item) => {
        acc.totalAmountNet = acc.totalAmountNet.add(item.amountNet);
        switch (item.status) {
          case 'DRAFT':
            acc.statusCounts.draft += 1;
            break;
          case 'READY':
            acc.statusCounts.ready += 1;
            break;
          case 'PROCESSING':
            acc.statusCounts.processing += 1;
            break;
          case 'PAID':
            acc.statusCounts.paid += 1;
            break;
          case 'FAILED':
            acc.statusCounts.failed += 1;
            break;
          case 'CANCELLED':
            acc.statusCounts.cancelled += 1;
            break;
          default:
            break;
        }
        return acc;
      },
      {
        totalAmountNet: new Prisma.Decimal(0),
        statusCounts: {
          draft: 0,
          ready: 0,
          processing: 0,
          paid: 0,
          failed: 0,
          cancelled: 0,
        },
      },
    );

    return {
      ...this.toSettlementBatchListItem(batch),
      items: batch.settlements.map((item) =>
        this.toPractitionerSettlement(item),
      ),
      summary: {
        settlementItemsCount: batch.settlements.length,
        totalAmountNet: totals.totalAmountNet.toString(),
        statusCounts: totals.statusCounts,
      },
    };
  }

  toPackageSettlement(
    settlement: PackageSettlementWithRelations,
  ): PackageSettlementViewModel {
    return {
      id: settlement.id,
      purchaseId: settlement.purchaseId,
      purchaseStatus: settlement.purchase
        ?.status as PackageSettlementViewModel['purchaseStatus'],
      practitionerId: settlement.practitionerId,
      practitionerDisplayName:
        settlement.practitioner?.user?.displayName ?? null,
      practitionerSlug: settlement.practitioner?.publicSlug ?? null,
      patientId: settlement.patientId,
      patientDisplayName: settlement.patient?.user?.displayName ?? null,
      packagePlanCode:
        settlement.purchase?.packagePlan?.code ??
        settlement.purchase?.planCodeSnapshot ??
        null,
      packagePlanTitle:
        settlement.purchase?.packagePlan?.title ??
        settlement.purchase?.titleSnapshot ??
        null,
      currency: settlement.currencyCode,
      status: settlement.status,
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
      reviewedByAdminId: settlement.reviewedByAdminId ?? null,
      releasedAt: settlement.releasedAt?.toISOString() ?? null,
      releasedByAdminId: settlement.releasedByAdminId ?? null,
      decision: settlement.decision ?? null,
      notes: settlement.notes ?? null,
      createdAt: settlement.createdAt.toISOString(),
      updatedAt: settlement.updatedAt.toISOString(),
    };
  }

  toPractitionerPayoutBalance(input: {
    practitionerId: string;
    practitionerName: string | null;
    currencyCode: string;
    payoutDestinationSnapshot: PractitionerPayoutDestinationSnapshotViewModel | null;
    payoutDestinationType: string | null;
    payoutDestinationSummaryMasked: string | null;
    normalSessionPayableAmount: Prisma.Decimal | string;
    packageReleasedPayableAmount: Prisma.Decimal | string;
    packageHeldAmount: Prisma.Decimal | string;
    totalPayableAmount: Prisma.Decimal | string;
    manualRecoveryAmount: Prisma.Decimal | string;
    lastPayoutAt: Date | null;
  }): PractitionerPayoutBalanceViewModel {
    return {
      practitionerId: input.practitionerId,
      practitionerName: input.practitionerName,
      currencyCode: input.currencyCode,
      payoutDestinationSnapshot: input.payoutDestinationSnapshot,
      payoutDestinationType: input.payoutDestinationType,
      payoutDestinationSummaryMasked: input.payoutDestinationSummaryMasked,
      normalSessionPayableAmount: input.normalSessionPayableAmount.toString(),
      packageReleasedPayableAmount:
        input.packageReleasedPayableAmount.toString(),
      packageHeldAmount: input.packageHeldAmount.toString(),
      totalPayableAmount: input.totalPayableAmount.toString(),
      manualRecoveryAmount: input.manualRecoveryAmount.toString(),
      lastPayoutAt: input.lastPayoutAt?.toISOString() ?? null,
    };
  }

  toPractitionerManualPayout(
    payout: PractitionerManualPayoutWithRelations,
  ): PractitionerManualPayoutViewModel {
    return {
      id: payout.id,
      practitionerId: payout.practitionerId,
      practitionerName: payout.practitioner?.user?.displayName ?? null,
      currencyCode: payout.currencyCode,
      amountPaid: payout.amountPaid.toString(),
      normalSessionAppliedAmount: payout.normalSessionAppliedAmount.toString(),
      packageReleasedAppliedAmount:
        payout.packageReleasedAppliedAmount.toString(),
      packageHeldAmountSnapshot: payout.packageHeldAmountSnapshot.toString(),
      totalPayableSnapshot: payout.totalPayableSnapshot.toString(),
      payoutMethod: payout.payoutMethod,
      transferReference: payout.transferReference ?? null,
      paidAt: payout.paidAt.toISOString(),
      notes: payout.notes ?? null,
      recordedByUserId: payout.recordedByUserId ?? null,
      recordedByDisplayName: payout.recordedByUser?.displayName ?? null,
      createdAt: payout.createdAt.toISOString(),
      updatedAt: payout.updatedAt.toISOString(),
    };
  }

  toPractitionerManualPayoutSummary(input: {
    practitionerId: string;
    practitionerName: string | null;
    practitionerSlug: string | null;
    safeDisplayCode: string;
    avatarUrl: string | null;
    primarySpecialtyName: string | null;
    payoutDestinationType: string | null;
    payoutDestinationSummaryMasked: string | null;
    egp: PractitionerPayoutBalanceViewModel;
    usd: PractitionerPayoutBalanceViewModel;
    hasPayable: boolean;
    hasPackage: boolean;
    lastPayoutAt: string | null;
  }): PractitionerManualPayoutSummaryViewModel {
    return input;
  }
}
