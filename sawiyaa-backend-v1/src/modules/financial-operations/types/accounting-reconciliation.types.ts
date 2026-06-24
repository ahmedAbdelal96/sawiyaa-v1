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

export type ReconciliationSeverity = 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';

export type ReconciliationIssue = {
  code: string;
  severity: ReconciliationSeverity;
  message: string;
  entityType: string;
  entityId: string;
  expected?: string | number | null;
  actual?: string | number | null;
  currencyCode?: string | null;
  metadata?: Record<string, unknown>;
};

export type ReconciliationResult = {
  ok: boolean;
  checkedAt: Date;
  scope: string;
  entityType: string;
  entityId: string;
  currencyCode?: string | null;
  issues: ReconciliationIssue[];
  summary?: Record<string, unknown>;
};

export const ACCOUNTING_RECONCILIATION_ISSUE_CODES = {
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  RECONCILIATION_EXECUTION_ERROR: 'RECONCILIATION_EXECUTION_ERROR',
  PAYMENT_MISSING_LEDGER_ENTRIES: 'PAYMENT_MISSING_LEDGER_ENTRIES',
  PAYMENT_NON_CAPTURED_HAS_LEDGER_ENTRIES:
    'PAYMENT_NON_CAPTURED_HAS_LEDGER_ENTRIES',
  PAYMENT_UNEXPECTED_LEDGER_ENTRY_TYPE: 'PAYMENT_UNEXPECTED_LEDGER_ENTRY_TYPE',
  PAYMENT_LEDGER_BREAKDOWN_MISMATCH: 'PAYMENT_LEDGER_BREAKDOWN_MISMATCH',
  PAYMENT_COLLECTION_MISMATCH: 'PAYMENT_COLLECTION_MISMATCH',
  PAYMENT_AMOUNT_TOTAL_MISMATCH: 'PAYMENT_AMOUNT_TOTAL_MISMATCH',
  PAYMENT_JOURNAL_UNBALANCED: 'PAYMENT_JOURNAL_UNBALANCED',
  PAYMENT_JOURNAL_METADATA_MISMATCH: 'PAYMENT_JOURNAL_METADATA_MISMATCH',
  PAYMENT_COUPON_REDEMPTION_MISSING: 'PAYMENT_COUPON_REDEMPTION_MISSING',
  PAYMENT_COUPON_SNAPSHOT_MISMATCH: 'PAYMENT_COUPON_SNAPSHOT_MISMATCH',
  PAYMENT_COUPON_OWNER_MISMATCH: 'PAYMENT_COUPON_OWNER_MISMATCH',
  PAYMENT_COUPON_SCOPE_MISMATCH: 'PAYMENT_COUPON_SCOPE_MISMATCH',
  WALLET_NOT_FOUND: 'WALLET_NOT_FOUND',
  WALLET_AVAILABLE_MISMATCH: 'WALLET_AVAILABLE_MISMATCH',
  WALLET_PENDING_MISMATCH: 'WALLET_PENDING_MISMATCH',
  WALLET_RESERVED_MISMATCH: 'WALLET_RESERVED_MISMATCH',
  WALLET_LIFETIME_EARNED_MISMATCH: 'WALLET_LIFETIME_EARNED_MISMATCH',
  WALLET_LIFETIME_PAID_OUT_MISMATCH: 'WALLET_LIFETIME_PAID_OUT_MISMATCH',
  WALLET_LAST_ENTRY_MISMATCH: 'WALLET_LAST_ENTRY_MISMATCH',
  WALLET_RESERVATION_MISMATCH: 'WALLET_RESERVATION_MISMATCH',
  SETTLEMENT_NOT_FOUND: 'SETTLEMENT_NOT_FOUND',
  SETTLEMENT_CURRENCY_MISMATCH: 'SETTLEMENT_CURRENCY_MISMATCH',
  SETTLEMENT_GROSS_MISMATCH: 'SETTLEMENT_GROSS_MISMATCH',
  SETTLEMENT_NET_MISMATCH: 'SETTLEMENT_NET_MISMATCH',
  SETTLEMENT_PAID_TOTAL_MISMATCH: 'SETTLEMENT_PAID_TOTAL_MISMATCH',
  SETTLEMENT_PAYOUT_LEDGER_MISMATCH: 'SETTLEMENT_PAYOUT_LEDGER_MISMATCH',
  SETTLEMENT_BATCH_CURRENCY_MISMATCH: 'SETTLEMENT_BATCH_CURRENCY_MISMATCH',
  SETTLEMENT_BATCH_TOTAL_MISMATCH: 'SETTLEMENT_BATCH_TOTAL_MISMATCH',
  REFUND_NOT_FOUND: 'REFUND_NOT_FOUND',
  REFUND_JOURNAL_UNBALANCED: 'REFUND_JOURNAL_UNBALANCED',
  REFUND_JOURNAL_CURRENCY_MISMATCH: 'REFUND_JOURNAL_CURRENCY_MISMATCH',
  REFUND_LEDGER_MISMATCH: 'REFUND_LEDGER_MISMATCH',
  REFUND_CUSTOMER_WALLET_CREDIT_MISSING:
    'REFUND_CUSTOMER_WALLET_CREDIT_MISSING',
  PACKAGE_SETTLEMENT_NOT_FOUND: 'PACKAGE_SETTLEMENT_NOT_FOUND',
  PACKAGE_SETTLEMENT_CURRENCY_MISMATCH:
    'PACKAGE_SETTLEMENT_CURRENCY_MISMATCH',
  PACKAGE_SETTLEMENT_COMPLETION_MISMATCH:
    'PACKAGE_SETTLEMENT_COMPLETION_MISMATCH',
  PACKAGE_SETTLEMENT_AMOUNT_MISMATCH: 'PACKAGE_SETTLEMENT_AMOUNT_MISMATCH',
  PACKAGE_SETTLEMENT_RELEASE_MISMATCH: 'PACKAGE_SETTLEMENT_RELEASE_MISMATCH',
} as const;

export type AccountingReconciliationIssueCode =
  (typeof ACCOUNTING_RECONCILIATION_ISSUE_CODES)[keyof typeof ACCOUNTING_RECONCILIATION_ISSUE_CODES];

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
