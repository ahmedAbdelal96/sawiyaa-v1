import { Injectable } from '@nestjs/common';
import { ReconciliationReviewStatus } from '@prisma/client';
import { ListAdminAccountingReconciliationDto } from '../dto/list-admin-accounting-reconciliation.dto';
import { ReconciliationOverviewViewModel } from '../types/accounting-reconciliation.types';
import { ListAdminAccountingReconciliationUseCase } from './list-admin-accounting-reconciliation.use-case';

@Injectable()
export class GetAdminAccountingReconciliationOverviewUseCase {
  constructor(
    private readonly listAdminAccountingReconciliationUseCase: ListAdminAccountingReconciliationUseCase,
  ) {}

  async execute(
    query: ListAdminAccountingReconciliationDto,
  ): Promise<ReconciliationOverviewViewModel> {
    const snapshot =
      await this.listAdminAccountingReconciliationUseCase.buildSnapshot(query);

    const totals = {
      totalItems: snapshot.items.length,
      matched: 0,
      pendingReview: 0,
      mismatch: 0,
      missingProof: 0,
      requiresAdjustment: 0,
      resolved: 0,
    };

    const anomalyCounter = new Map<string, number>();

    for (const item of snapshot.items) {
      switch (item.effectiveStatus) {
        case ReconciliationReviewStatus.MATCHED:
          totals.matched += 1;
          break;
        case ReconciliationReviewStatus.PENDING_REVIEW:
          totals.pendingReview += 1;
          break;
        case ReconciliationReviewStatus.MISMATCH:
          totals.mismatch += 1;
          break;
        case ReconciliationReviewStatus.MISSING_PROOF:
          totals.missingProof += 1;
          break;
        case ReconciliationReviewStatus.REQUIRES_ADJUSTMENT:
          totals.requiresAdjustment += 1;
          break;
        case ReconciliationReviewStatus.RESOLVED:
          totals.resolved += 1;
          break;
      }

      for (const anomaly of item.anomalies) {
        anomalyCounter.set(
          anomaly.code,
          (anomalyCounter.get(anomaly.code) ?? 0) + 1,
        );
      }
    }

    const anomalies = Array.from(anomalyCounter.entries())
      .map(([code, count]) => ({
        code: code as ReconciliationOverviewViewModel['anomalies'][number]['code'],
        count,
      }))
      .sort((a, b) => b.count - a.count || a.code.localeCompare(b.code));

    return {
      generatedAt: new Date().toISOString(),
      range: {
        from: snapshot.filters.from,
        to: snapshot.filters.to,
      },
      currencyCode: snapshot.filters.currencyCode,
      totals,
      anomalies,
    };
  }
}
