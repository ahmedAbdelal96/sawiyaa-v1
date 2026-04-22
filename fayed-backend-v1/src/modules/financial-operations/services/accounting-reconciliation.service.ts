import { Injectable } from '@nestjs/common';
import {
  JournalEntrySourceType,
  Prisma,
  ReconciliationReviewStatus,
} from '@prisma/client';
import {
  ReconciliationAnomaly,
  ReconciliationSystemStatus,
} from '../types/accounting-reconciliation.types';

type JournalSnapshot = {
  id: string;
  occurredAt: Date;
  currencyCode: string;
  metadataJson: Prisma.JsonValue | null;
};

type ReviewSnapshot = {
  status: ReconciliationReviewStatus;
  note: string | null;
  reviewedAt: Date | null;
  reviewedByUserId: string | null;
  reviewedByDisplayName: string | null;
} | null;

@Injectable()
export class AccountingReconciliationService {
  toMoney(value: unknown) {
    if (typeof value === 'number') {
      return new Prisma.Decimal(value).toDecimalPlaces(2);
    }
    if (typeof value === 'string' && value.trim().length > 0) {
      return new Prisma.Decimal(value).toDecimalPlaces(2);
    }
    return new Prisma.Decimal(0);
  }

  parseMetadata(json: Prisma.JsonValue | null | undefined) {
    if (!json || typeof json !== 'object' || Array.isArray(json)) {
      return {};
    }
    return json as Record<string, unknown>;
  }

  evaluatePayment(input: {
    amountTotal: Prisma.Decimal;
    vatAmountSnapshot: Prisma.Decimal | null;
    gatewayFeeAmountSnapshot: Prisma.Decimal | null;
    journal: JournalSnapshot | null;
  }) {
    const anomalies: ReconciliationAnomaly[] = [];
    const journalAmount = input.journal
      ? this.toMoney(this.parseMetadata(input.journal.metadataJson)['amountTotal'])
      : null;

    if (!input.journal) {
      anomalies.push({
        code: 'MISSING_JOURNAL_ENTRY',
        level: 'CRITICAL',
        message: 'Captured payment has no accounting journal entry.',
      });
    } else if (!journalAmount?.equals(input.amountTotal)) {
      anomalies.push({
        code: 'AMOUNT_MISMATCH',
        level: 'CRITICAL',
        message: 'Captured payment amount differs from posted journal amount.',
      });
    }

    if (input.vatAmountSnapshot == null) {
      anomalies.push({
        code: 'MISSING_VAT_SNAPSHOT',
        level: 'WARNING',
        message: 'Payment posting snapshot is missing VAT amount.',
      });
    }

    if (input.gatewayFeeAmountSnapshot == null) {
      anomalies.push({
        code: 'MISSING_GATEWAY_FEE_SNAPSHOT',
        level: 'WARNING',
        message: 'Payment posting snapshot is missing gateway fee amount.',
      });
    }

    return {
      anomalies,
      journalAmount: journalAmount?.toFixed(2) ?? null,
    };
  }

  evaluateRefund(input: {
    amount: Prisma.Decimal;
    metadataJson: Prisma.JsonValue | null;
    sessionId: string | null;
    journal: JournalSnapshot | null;
  }) {
    const anomalies: ReconciliationAnomaly[] = [];
    const journalMetadata = this.parseMetadata(input.journal?.metadataJson);
    const journalAmount = input.journal
      ? this.toMoney(journalMetadata['refundAmount'])
      : null;

    if (!input.journal) {
      anomalies.push({
        code: 'MISSING_JOURNAL_ENTRY',
        level: 'CRITICAL',
        message: 'Succeeded refund has no accounting journal entry.',
      });
    } else if (!journalAmount?.equals(input.amount)) {
      anomalies.push({
        code: 'AMOUNT_MISMATCH',
        level: 'CRITICAL',
        message: 'Refund amount differs from posted journal refund amount.',
      });
    }

    const refundMetadata = this.parseMetadata(input.metadataJson);
    const source = refundMetadata['source'];
    const cancellationContext = refundMetadata['policy'];
    if (
      input.sessionId &&
      source === 'session-cancellation-policy' &&
      !cancellationContext
    ) {
      anomalies.push({
        code: 'MISSING_CANCELLATION_CONTEXT',
        level: 'WARNING',
        message: 'Refund is linked to cancellation policy without full context snapshot.',
      });
    }

    return {
      anomalies,
      journalAmount: journalAmount?.toFixed(2) ?? null,
    };
  }

  evaluatePayout(input: {
    amountPaid: Prisma.Decimal;
    transferFeeAmount: Prisma.Decimal | null;
    payoutMethodSnapshot: Prisma.JsonValue | null;
    proofPresent: boolean;
    journal: JournalSnapshot | null;
  }) {
    const anomalies: ReconciliationAnomaly[] = [];
    const journalMetadata = this.parseMetadata(input.journal?.metadataJson);
    const journalAmount = input.journal
      ? this.toMoney(journalMetadata['amountPaid'])
      : null;

    if (!input.journal) {
      anomalies.push({
        code: 'MISSING_JOURNAL_ENTRY',
        level: 'CRITICAL',
        message: 'Recorded payout has no accounting journal entry.',
      });
    } else if (!journalAmount?.equals(input.amountPaid)) {
      anomalies.push({
        code: 'AMOUNT_MISMATCH',
        level: 'CRITICAL',
        message: 'Payout amount differs from posted journal payout amount.',
      });
    }

    if (!input.proofPresent) {
      anomalies.push({
        code: 'MISSING_PAYOUT_PROOF',
        level: 'WARNING',
        message: 'Payout operation is missing payout proof artifact.',
      });
    }

    const transferFeeFromSnapshot = this.toMoney(
      this.parseMetadata(input.payoutMethodSnapshot)['transferFeeAmount'],
    );
    if (input.transferFeeAmount && !transferFeeFromSnapshot.equals(input.transferFeeAmount)) {
      anomalies.push({
        code: 'MISSING_TRANSFER_FEE_SNAPSHOT',
        level: 'WARNING',
        message: 'Payout transfer fee snapshot does not match payout transfer fee amount.',
      });
    }

    return {
      anomalies,
      journalAmount: journalAmount?.toFixed(2) ?? null,
    };
  }

  deriveSystemStatus(
    sourceType: JournalEntrySourceType,
    anomalies: ReconciliationAnomaly[],
  ): ReconciliationSystemStatus {
    if (anomalies.some((item) => item.code === 'MISSING_JOURNAL_ENTRY')) {
      return 'MISMATCH';
    }

    if (
      sourceType === JournalEntrySourceType.PRACTITIONER_PAYOUT &&
      anomalies.some((item) => item.code === 'MISSING_PAYOUT_PROOF')
    ) {
      return 'MISSING_PROOF';
    }

    if (anomalies.some((item) => item.code === 'AMOUNT_MISMATCH')) {
      return 'MISMATCH';
    }

    if (
      anomalies.some((item) =>
        [
          'MISSING_VAT_SNAPSHOT',
          'MISSING_GATEWAY_FEE_SNAPSHOT',
          'MISSING_CANCELLATION_CONTEXT',
          'MISSING_TRANSFER_FEE_SNAPSHOT',
        ].includes(item.code),
      )
    ) {
      return 'REQUIRES_ADJUSTMENT';
    }

    return 'MATCHED';
  }

  deriveEffectiveStatus(input: {
    systemStatus: ReconciliationSystemStatus;
    review: ReviewSnapshot;
  }) {
    const systemToReviewStatus: Record<
      ReconciliationSystemStatus,
      ReconciliationReviewStatus
    > = {
      MATCHED: ReconciliationReviewStatus.MATCHED,
      MISMATCH: ReconciliationReviewStatus.MISMATCH,
      MISSING_PROOF: ReconciliationReviewStatus.MISSING_PROOF,
      REQUIRES_ADJUSTMENT: ReconciliationReviewStatus.REQUIRES_ADJUSTMENT,
    };

    if (!input.review) {
      return systemToReviewStatus[input.systemStatus];
    }

    if (input.review.status === ReconciliationReviewStatus.PENDING_REVIEW) {
      return ReconciliationReviewStatus.PENDING_REVIEW;
    }

    return input.review.status;
  }
}
