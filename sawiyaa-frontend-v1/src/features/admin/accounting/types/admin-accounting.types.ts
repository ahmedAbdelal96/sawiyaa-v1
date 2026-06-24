export type AccountingDashboardQuery = {
  from?: string;
  to?: string;
  currencyCode?: string;
  recentLimit?: number;
};

export type AccountingKpiSnapshot = {
  grossInflow: string;
  platformRevenue: string;
  practitionerPayableOutstanding: string;
  refundsTotal: string;
  vatTotal: string;
  feesTotal: string;
  currencyCode: string | null;
};

export type AccountingTrendPoint = {
  date: string;
  revenue: string;
  payableIncrements: string;
  payouts: string;
  refunds: string;
  fees: string;
};

export type AccountingRecentEvent = {
  journalEntryId: string;
  sourceType: "PAYMENT_CAPTURED" | "REFUND_SUCCEEDED" | "PRACTITIONER_PAYOUT";
  sourceId: string;
  occurredAt: string;
  currencyCode: string;
  amount: string;
  summary: string;
};

export type AccountingDashboardData = {
  generatedAt: string;
  range: {
    from: string;
    to: string;
  };
  currencyCode: string | null;
  kpis: AccountingKpiSnapshot;
  trends: AccountingTrendPoint[];
  recentEvents: AccountingRecentEvent[];
};

export type LedgerAccountFilterOption = {
  id: string;
  code: string;
  name: string;
  accountType: string;
  scope: string;
  currencyCode: string;
  practitionerId: string | null;
};

export type LedgerExplorerQuery = {
  page?: number;
  limit?: number;
  from?: string;
  to?: string;
  ledgerAccountId?: string;
  sourceType?: "PAYMENT_CAPTURED" | "REFUND_SUCCEEDED" | "PRACTITIONER_PAYOUT";
  practitionerId?: string;
  currencyCode?: string;
  journalEntryId?: string;
  query?: string;
};

export type LedgerExplorerRow = {
  id: string;
  journalEntryId: string;
  sourceType: "PAYMENT_CAPTURED" | "REFUND_SUCCEEDED" | "PRACTITIONER_PAYOUT";
  sourceId: string;
  occurredAt: string;
  createdAt: string;
  currencyCode: string;
  ledgerAccountId: string;
  ledgerAccountCode: string;
  ledgerAccountName: string;
  ledgerAccountScope: string;
  practitionerId: string | null;
  direction: "DEBIT" | "CREDIT";
  amount: string;
  memo: string | null;
  referenceType: string | null;
  referenceId: string | null;
};

export type LedgerExplorerPagination = {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
};

export type LedgerExplorerFilters = {
  from: string | null;
  to: string | null;
  ledgerAccountId: string | null;
  sourceType: "PAYMENT_CAPTURED" | "REFUND_SUCCEEDED" | "PRACTITIONER_PAYOUT" | null;
  practitionerId: string | null;
  currencyCode: string | null;
  journalEntryId: string | null;
  query: string | null;
};

export type LedgerExplorerListData = {
  items: LedgerExplorerRow[];
  pagination: LedgerExplorerPagination;
  filters: LedgerExplorerFilters;
};

export type JournalEntryDetail = {
  id: string;
  sourceType: "PAYMENT_CAPTURED" | "REFUND_SUCCEEDED" | "PRACTITIONER_PAYOUT";
  sourceId: string;
  occurredAt: string;
  createdAt: string;
  currencyCode: string;
  description: string | null;
  lines: LedgerExplorerRow[];
};

export type ReconciliationSourceType =
  | "PAYMENT_CAPTURED"
  | "REFUND_SUCCEEDED"
  | "PRACTITIONER_PAYOUT";

export type ReconciliationReviewStatus =
  | "PENDING_REVIEW"
  | "MATCHED"
  | "MISMATCH"
  | "MISSING_PROOF"
  | "REQUIRES_ADJUSTMENT"
  | "RESOLVED";

export type ReconciliationSystemStatus =
  | "MATCHED"
  | "MISMATCH"
  | "MISSING_PROOF"
  | "REQUIRES_ADJUSTMENT";

export type ReconciliationAnomalyCode =
  | "MISSING_JOURNAL_ENTRY"
  | "MISSING_PAYOUT_PROOF"
  | "AMOUNT_MISMATCH"
  | "MISSING_VAT_SNAPSHOT"
  | "MISSING_GATEWAY_FEE_SNAPSHOT"
  | "MISSING_CANCELLATION_CONTEXT"
  | "MISSING_TRANSFER_FEE_SNAPSHOT";

export type ReconciliationAnomaly = {
  code: ReconciliationAnomalyCode;
  level: "INFO" | "WARNING" | "CRITICAL";
  message: string;
};

export type ReconciliationFilters = {
  from: string;
  to: string;
  sourceType: ReconciliationSourceType | null;
  practitionerId: string | null;
  currencyCode: string | null;
  status: ReconciliationReviewStatus | null;
  query: string | null;
  anomalyCode: ReconciliationAnomalyCode | null;
};

export type ReconciliationItem = {
  sourceType: ReconciliationSourceType;
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

export type ReconciliationQuery = {
  page?: number;
  limit?: number;
  from?: string;
  to?: string;
  sourceType?: ReconciliationSourceType;
  practitionerId?: string;
  currencyCode?: string;
  status?: ReconciliationReviewStatus;
  query?: string;
  anomalyCode?: ReconciliationAnomalyCode;
};

export type ReconciliationListData = {
  items: ReconciliationItem[];
  pagination: LedgerExplorerPagination;
  filters: ReconciliationFilters;
};

export type ReconciliationOverview = {
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

export type UpdateReconciliationReviewInput = {
  status: ReconciliationReviewStatus;
  note?: string;
};

export type ReconciliationReviewUpdate = {
  item: {
    sourceType: ReconciliationSourceType;
    sourceId: string;
    status: ReconciliationReviewStatus;
    note: string | null;
    reviewedAt: string | null;
    reviewedByUserId: string | null;
    reviewedByDisplayName: string | null;
  };
};
