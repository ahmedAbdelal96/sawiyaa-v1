import { BadRequestException, Injectable } from '@nestjs/common';
import {
  JournalEntrySourceType,
  ReconciliationReviewStatus,
} from '@prisma/client';
import { ListAdminAccountingReconciliationDto } from '../dto/list-admin-accounting-reconciliation.dto';
import { AccountingReconciliationRepository } from '../repositories/accounting-reconciliation.repository';
import { AccountingReconciliationService } from '../services/accounting-reconciliation.service';
import { ReconciliationListViewModel } from '../types/accounting-reconciliation.types';
import { FINANCIAL_OPS_ERROR_CODES } from '../types/financial-operations.types';

type JournalSnapshot = Awaited<
  ReturnType<AccountingReconciliationRepository['listJournalEntriesBySources']>
>[number];
type ReconciliationReviewSnapshot = Awaited<
  ReturnType<AccountingReconciliationRepository['listReviewsBySources']>
>[number];

@Injectable()
export class ListAdminAccountingReconciliationUseCase {
  constructor(
    private readonly repository: AccountingReconciliationRepository,
    private readonly reconciliationService: AccountingReconciliationService,
  ) {}

  async execute(
    query: ListAdminAccountingReconciliationDto,
  ): Promise<ReconciliationListViewModel> {
    const snapshot = await this.buildSnapshot(query);
    const skip = (snapshot.page - 1) * snapshot.limit;
    const items = snapshot.items.slice(skip, skip + snapshot.limit);

    return {
      items,
      pagination: {
        page: snapshot.page,
        limit: snapshot.limit,
        totalItems: snapshot.items.length,
        totalPages: Math.max(
          1,
          Math.ceil(snapshot.items.length / snapshot.limit),
        ),
      },
      filters: snapshot.filters,
    };
  }

  async buildSnapshot(query: ListAdminAccountingReconciliationDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const to = query.to ? new Date(query.to) : new Date();
    const from = query.from
      ? new Date(query.from)
      : new Date(to.getTime() - 29 * 24 * 60 * 60 * 1000);

    if (
      Number.isNaN(from.getTime()) ||
      Number.isNaN(to.getTime()) ||
      from > to
    ) {
      throw new BadRequestException({
        messageKey: 'financialOperations.errors.invalidFilter',
        error: FINANCIAL_OPS_ERROR_CODES.invalidFilter,
      });
    }

    const sourceType = query.sourceType ?? null;
    const currencyCode = query.currencyCode?.trim().toUpperCase();
    const searchQuery = query.query?.trim() || undefined;

    const [payments, refunds, payouts] = await Promise.all([
      sourceType && sourceType !== JournalEntrySourceType.PAYMENT_CAPTURED
        ? Promise.resolve([])
        : this.repository.listCapturedPayments({
            from,
            to,
            currencyCode,
            practitionerId: query.practitionerId,
            query: searchQuery,
          }),
      sourceType && sourceType !== JournalEntrySourceType.REFUND_SUCCEEDED
        ? Promise.resolve([])
        : this.repository.listSucceededRefunds({
            from,
            to,
            currencyCode,
            practitionerId: query.practitionerId,
            query: searchQuery,
          }),
      sourceType && sourceType !== JournalEntrySourceType.PRACTITIONER_PAYOUT
        ? Promise.resolve([])
        : this.repository.listRecordedPayouts({
            from,
            to,
            currencyCode,
            practitionerId: query.practitionerId,
            query: searchQuery,
          }),
    ]);

    const [paymentJournals, refundJournals, payoutJournals] = await Promise.all(
      [
        this.repository.listJournalEntriesBySources({
          sourceType: JournalEntrySourceType.PAYMENT_CAPTURED,
          sourceIds: payments.map((item) => item.id),
        }),
        this.repository.listJournalEntriesBySources({
          sourceType: JournalEntrySourceType.REFUND_SUCCEEDED,
          sourceIds: refunds.map((item) => item.id),
        }),
        this.repository.listJournalEntriesBySources({
          sourceType: JournalEntrySourceType.PRACTITIONER_PAYOUT,
          sourceIds: payouts.map((item) => item.id),
        }),
      ],
    );

    const [paymentReviews, refundReviews, payoutReviews] = await Promise.all([
      this.repository.listReviewsBySources({
        sourceType: JournalEntrySourceType.PAYMENT_CAPTURED,
        sourceIds: payments.map((item) => item.id),
      }),
      this.repository.listReviewsBySources({
        sourceType: JournalEntrySourceType.REFUND_SUCCEEDED,
        sourceIds: refunds.map((item) => item.id),
      }),
      this.repository.listReviewsBySources({
        sourceType: JournalEntrySourceType.PRACTITIONER_PAYOUT,
        sourceIds: payouts.map((item) => item.id),
      }),
    ]);

    const paymentJournalMap = this.indexBySourceId(paymentJournals);
    const refundJournalMap = this.indexBySourceId(refundJournals);
    const payoutJournalMap = this.indexBySourceId(payoutJournals);

    const paymentReviewMap = this.indexBySourceId(paymentReviews);
    const refundReviewMap = this.indexBySourceId(refundReviews);
    const payoutReviewMap = this.indexBySourceId(payoutReviews);

    const paymentItems = payments.map((payment) => {
      const journal = paymentJournalMap.get(payment.id) ?? null;
      const review = paymentReviewMap.get(payment.id) ?? null;
      const result = this.reconciliationService.evaluatePayment({
        amountTotal: payment.amountTotal,
        vatAmountSnapshot: payment.vatAmountSnapshot,
        gatewayFeeAmountSnapshot: payment.gatewayFeeAmountSnapshot,
        journal: this.toJournalSnapshot(journal),
      });
      const systemStatus = this.reconciliationService.deriveSystemStatus(
        JournalEntrySourceType.PAYMENT_CAPTURED,
        result.anomalies,
      );
      const effectiveStatus = this.reconciliationService.deriveEffectiveStatus({
        systemStatus,
        review: this.toReviewSnapshot(review),
      });

      return {
        sourceType: JournalEntrySourceType.PAYMENT_CAPTURED,
        sourceId: payment.id,
        practitionerId: payment.practitionerId ?? null,
        paymentId: payment.id,
        refundId: null,
        settlementId: null,
        payoutId: null,
        currencyCode: payment.currencyCode,
        occurredAt: (payment.capturedAt ?? new Date()).toISOString(),
        operationalAmount: payment.amountTotal.toFixed(2),
        journalEntryId: journal?.id ?? null,
        journalOccurredAt: journal?.occurredAt.toISOString() ?? null,
        journalAmount: result.journalAmount,
        proofPresent: null,
        systemStatus,
        reviewStatus: review?.status ?? null,
        effectiveStatus,
        reviewNote: review?.note ?? null,
        reviewedAt: review?.reviewedAt?.toISOString() ?? null,
        reviewedByUserId: review?.reviewedByUserId ?? null,
        reviewedByDisplayName: review?.reviewedByUser?.displayName ?? null,
        anomalies: result.anomalies,
      };
    });

    const refundItems = refunds.map((refund) => {
      const journal = refundJournalMap.get(refund.id) ?? null;
      const review = refundReviewMap.get(refund.id) ?? null;
      const result = this.reconciliationService.evaluateRefund({
        amount: refund.amount,
        metadataJson: refund.metadataJson,
        sessionId: refund.sessionId ?? null,
        journal: this.toJournalSnapshot(journal),
      });
      const systemStatus = this.reconciliationService.deriveSystemStatus(
        JournalEntrySourceType.REFUND_SUCCEEDED,
        result.anomalies,
      );
      const effectiveStatus = this.reconciliationService.deriveEffectiveStatus({
        systemStatus,
        review: this.toReviewSnapshot(review),
      });

      return {
        sourceType: JournalEntrySourceType.REFUND_SUCCEEDED,
        sourceId: refund.id,
        practitionerId: refund.payment.practitionerId ?? null,
        paymentId: refund.paymentId,
        refundId: refund.id,
        settlementId: null,
        payoutId: null,
        currencyCode: refund.currencyCode,
        occurredAt: (refund.processedAt ?? new Date()).toISOString(),
        operationalAmount: refund.amount.toFixed(2),
        journalEntryId: journal?.id ?? null,
        journalOccurredAt: journal?.occurredAt.toISOString() ?? null,
        journalAmount: result.journalAmount,
        proofPresent: null,
        systemStatus,
        reviewStatus: review?.status ?? null,
        effectiveStatus,
        reviewNote: review?.note ?? null,
        reviewedAt: review?.reviewedAt?.toISOString() ?? null,
        reviewedByUserId: review?.reviewedByUserId ?? null,
        reviewedByDisplayName: review?.reviewedByUser?.displayName ?? null,
        anomalies: result.anomalies,
      };
    });

    const payoutItems = payouts.map((payout) => {
      const journal = payoutJournalMap.get(payout.id) ?? null;
      const review = payoutReviewMap.get(payout.id) ?? null;
      const result = this.reconciliationService.evaluatePayout({
        amountPaid: payout.amountPaid,
        transferFeeAmount: payout.transferFeeAmount,
        payoutMethodSnapshot: payout.payoutMethodSnapshot,
        proofPresent: Boolean(payout.proof),
        journal: this.toJournalSnapshot(journal),
      });
      const systemStatus = this.reconciliationService.deriveSystemStatus(
        JournalEntrySourceType.PRACTITIONER_PAYOUT,
        result.anomalies,
      );
      const effectiveStatus = this.reconciliationService.deriveEffectiveStatus({
        systemStatus,
        review: this.toReviewSnapshot(review),
      });

      return {
        sourceType: JournalEntrySourceType.PRACTITIONER_PAYOUT,
        sourceId: payout.id,
        practitionerId: payout.practitionerId,
        paymentId: null,
        refundId: null,
        settlementId: payout.settlementId,
        payoutId: payout.id,
        currencyCode: payout.currencyCode,
        occurredAt: payout.effectiveAt.toISOString(),
        operationalAmount: payout.amountPaid.toFixed(2),
        journalEntryId: journal?.id ?? null,
        journalOccurredAt: journal?.occurredAt.toISOString() ?? null,
        journalAmount: result.journalAmount,
        proofPresent: Boolean(payout.proof),
        systemStatus,
        reviewStatus: review?.status ?? null,
        effectiveStatus,
        reviewNote: review?.note ?? null,
        reviewedAt: review?.reviewedAt?.toISOString() ?? null,
        reviewedByUserId: review?.reviewedByUserId ?? null,
        reviewedByDisplayName: review?.reviewedByUser?.displayName ?? null,
        anomalies: result.anomalies,
      };
    });

    const merged = [...paymentItems, ...refundItems, ...payoutItems]
      .filter((item) => {
        if (query.status && item.effectiveStatus !== query.status) {
          return false;
        }
        if (
          query.anomalyCode &&
          !item.anomalies.some((anomaly) => anomaly.code === query.anomalyCode)
        ) {
          return false;
        }
        if (searchQuery) {
          const searchable = [
            item.sourceId,
            item.paymentId,
            item.refundId,
            item.settlementId,
            item.payoutId,
            item.reviewNote,
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();
          if (!searchable.includes(searchQuery.toLowerCase())) {
            return false;
          }
        }
        return true;
      })
      .sort((a, b) => {
        const left = new Date(a.occurredAt).getTime();
        const right = new Date(b.occurredAt).getTime();
        if (left !== right) {
          return right - left;
        }
        return a.sourceId.localeCompare(b.sourceId);
      });

    return {
      page,
      limit,
      items: merged,
      filters: {
        from: from.toISOString(),
        to: to.toISOString(),
        sourceType,
        practitionerId: query.practitionerId ?? null,
        currencyCode: currencyCode ?? null,
        status: query.status ?? null,
        query: searchQuery ?? null,
        anomalyCode: query.anomalyCode ?? null,
      },
    };
  }

  private indexBySourceId<T extends { sourceId: string }>(
    items: T[],
  ): Map<string, T> {
    const indexed = new Map<string, T>();
    for (const item of items) {
      indexed.set(item.sourceId, item);
    }
    return indexed;
  }

  private toReviewSnapshot(review: ReconciliationReviewSnapshot | null) {
    if (!review) {
      return null;
    }

    return {
      status: review.status,
      note: review.note,
      reviewedAt: review.reviewedAt,
      reviewedByUserId: review.reviewedByUserId,
      reviewedByDisplayName: review.reviewedByUser?.displayName ?? null,
    };
  }

  private toJournalSnapshot(journal: JournalSnapshot | null) {
    if (!journal) {
      return null;
    }

    return {
      id: journal.id,
      occurredAt: journal.occurredAt,
      currencyCode: journal.currencyCode,
      metadataJson: journal.metadataJson,
    };
  }
}
