import {
  JournalEntrySourceType,
  ReconciliationReviewStatus,
} from '@prisma/client';

export type ReconciliationAnomalyCode =
  | 'MISSING_JOURNAL_ENTRY'
  | 'MISSING_PAYOUT_PROOF'
  | 'AMOUNT_MISMATCH'
  | 'MISSING_VAT_SNAPSHOT'
  | 'MISSING_GATEWAY_FEE_SNAPSHOT'
  | 'MISSING_CANCELLATION_CONTEXT'
  | 'MISSING_TRANSFER_FEE_SNAPSHOT';

export type ReconciliationAnomaly = {
  code: ReconciliationAnomalyCode;
  level: 'INFO' | 'WARNING' | 'CRITICAL';
  message: string;
};

export type ReconciliationSystemStatus =
  | 'MATCHED'
  | 'MISMATCH'
  | 'MISSING_PROOF'
  | 'REQUIRES_ADJUSTMENT';

export type ReconciliationOverviewViewModel = {
  generatedAt: string;
  range: {
    from: string;
    to: string;
  };
  currencyCode: string | null;
  totals: {
    totalItems: number;
    matched: number;
    pendingReview: number;
    mismatch: number;
    missingProof: number;
    requiresAdjustment: number;
    resolved: number;
  };
  anomalies: Array<{
    code: ReconciliationAnomalyCode;
    count: number;
  }>;
};

export type ReconciliationItemViewModel = {
  sourceType: JournalEntrySourceType;
  sourceId: string;
  practitionerId: string | null;
  paymentId: string | null;
  refundId: string | null;
  settlementId: string | null;
  payoutId: string | null;
  currencyCode: string;
  occurredAt: string;
  operationalAmount: string;
  journalEntryId: string | null;
  journalOccurredAt: string | null;
  journalAmount: string | null;
  proofPresent: boolean | null;
  systemStatus: ReconciliationSystemStatus;
  reviewStatus: ReconciliationReviewStatus | null;
  effectiveStatus: ReconciliationReviewStatus;
  reviewNote: string | null;
  reviewedAt: string | null;
  reviewedByUserId: string | null;
  reviewedByDisplayName: string | null;
  anomalies: ReconciliationAnomaly[];
};

export type ReconciliationListViewModel = {
  items: ReconciliationItemViewModel[];
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  };
  filters: {
    from: string;
    to: string;
    sourceType: JournalEntrySourceType | null;
    practitionerId: string | null;
    currencyCode: string | null;
    status: ReconciliationReviewStatus | null;
    query: string | null;
    anomalyCode: ReconciliationAnomalyCode | null;
  };
};
