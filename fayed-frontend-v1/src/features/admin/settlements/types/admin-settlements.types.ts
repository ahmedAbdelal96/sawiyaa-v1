export type SettlementBatchStatus =
  | "DRAFT"
  | "GENERATED"
  | "FINALIZED"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED";

export type PractitionerSettlementStatus =
  | "DRAFT"
  | "READY"
  | "PROCESSING"
  | "PAID"
  | "FAILED"
  | "CANCELLED";

export type SettlementPayoutMethod =
  | "MANUAL_BANK_TRANSFER"
  | "WALLET_TRANSFER"
  | "CASH"
  | "OTHER";

export type SettlementPayoutSource =
  | "BATCH_CLOSEOUT"
  | "MANUAL_EXCEPTION";

export type ListSettlementBatchesParams = {
  page?: number;
  limit?: number;
  currencyCode?: string;
  status?: SettlementBatchStatus;
  periodYear?: number;
  periodMonth?: number;
  createdFrom?: string;
  createdTo?: string;
};

export type SettlementBatchListItem = {
  id: string;
  slug: string;
  status: SettlementBatchStatus;
  currency: string;
  periodYear: number;
  periodMonth: number;
  totalAmount: string;
  settlementItemsCount: number;
  generatedAt: string | null;
  finalizedAt: string | null;
  createdAt: string;
};

export type SettlementBatchStatusCounts = {
  draft: number;
  ready: number;
  processing: number;
  paid: number;
  failed: number;
  cancelled: number;
};

export type SettlementBatchOperationalSummary = {
  settlementItemsCount: number;
  totalAmountNet: string;
  statusCounts: SettlementBatchStatusCounts;
};

export type PractitionerSettlementItem = {
  id: string;
  batchId: string;
  batchSlug: string;
  batchPeriodYear: number;
  batchPeriodMonth: number;
  batchStatus: SettlementBatchStatus;
  practitionerId: string;
  status: PractitionerSettlementStatus;
  currency: string;
  amountGross: string;
  amountAdjustments: string;
  amountNet: string;
  payoutMethodSnapshot: Record<string, unknown> | null;
  externalPayoutRef: string | null;
  paidAt: string | null;
  failedAt: string | null;
  notes: string | null;
  createdAt: string;
};

export type SettlementPayoutRecordItem = {
  id: string;
  batchId: string;
  batchSlug: string;
  batchPeriodYear: number;
  batchPeriodMonth: number;
  batchStatus: SettlementBatchStatus;
  settlementId: string;
  practitionerId: string;
  amountNet: string;
  currency: string;
  payoutMethod: SettlementPayoutMethod;
  payoutSource: SettlementPayoutSource;
  externalPayoutRef: string | null;
  notes: string | null;
  effectiveAt: string;
  processedByUserId: string | null;
  processedByDisplayName: string | null;
  createdAt: string;
};

export type SettlementBatchDetails = SettlementBatchListItem & {
  items: PractitionerSettlementItem[];
  summary: SettlementBatchOperationalSummary;
};

export type SettlementBatchesPagination = {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
};

export type Pagination = SettlementBatchesPagination;

export type SettlementBatchListResponseData = {
  items: SettlementBatchListItem[];
  pagination: SettlementBatchesPagination;
};

export type SettlementBatchDetailResponseData = {
  item: SettlementBatchDetails;
};

export type GenerateSettlementBatchInput = {
  periodYear: number;
  periodMonth: number;
  currencyCode: string;
};

export type MarkSettlementPaidInput = {
  externalPayoutRef?: string;
  payoutMethod?: SettlementPayoutMethod;
  effectiveAt?: string;
  notes?: string;
};

export type MarkSettlementFailedInput = {
  notes?: string;
};

export type ListPractitionerSettlementsParams = {
  page?: number;
  limit?: number;
  status?: PractitionerSettlementStatus;
  currencyCode?: string;
  createdFrom?: string;
  createdTo?: string;
};

export type ListSettlementPayoutsParams = {
  page?: number;
  limit?: number;
  payoutMethod?: SettlementPayoutMethod;
  payoutSource?: SettlementPayoutSource;
  batchId?: string;
  settlementId?: string;
  createdFrom?: string;
  createdTo?: string;
};

export type PractitionerSettlementListResponseData = {
  items: PractitionerSettlementItem[];
  pagination: SettlementBatchesPagination;
};

export type SettlementPayoutListResponseData = {
  items: SettlementPayoutRecordItem[];
  pagination: SettlementBatchesPagination;
};

export type SettlementPayoutItemResponseData = {
  item: SettlementPayoutRecordItem;
};

export type RecordPractitionerSettlementPayoutInput = {
  payoutMethod: SettlementPayoutMethod;
  externalPayoutRef?: string;
  notes?: string;
  effectiveAt?: string;
};

export type PractitionerPayoutProof = {
  id: string;
  fileName: string;
  mimeType: string;
  fileSizeBytes: number;
  originalFileName: string | null;
  uploadedAt: string;
  downloadUrl: string;
};

export type PractitionerPayoutDueSummary = {
  currency: string;
  dueCount: number;
  dueAmountNet: string;
  lastDueAt: string | null;
  walletAvailableBalance: string | null;
  walletReservedBalance: string | null;
  walletPendingBalance: string | null;
  walletUpdatedAt: string | null;
};

export type PractitionerPayoutDueItem = {
  id: string;
  practitionerId: string;
  status: PractitionerSettlementStatus;
  currency: string;
  amountGross: string;
  amountAdjustments: string;
  amountNet: string;
  amountPaidTotal: string;
  amountRemaining: string;
  externalPayoutRef: string | null;
  paidAt: string | null;
  failedAt: string | null;
  notes: string | null;
  createdAt: string;
};

export type PractitionerPayoutDueListResponseData = {
  items: PractitionerPayoutDueItem[];
  pagination: Pagination;
  summaries: PractitionerPayoutDueSummary[];
};

export type PractitionerPayoutHistoryItem = {
  id: string;
  practitionerId: string;
  settlementId: string;
  amountPaid: string;
  currency: string;
  payoutMethod: SettlementPayoutMethod;
  payoutSource: SettlementPayoutSource;
  payoutDate: string;
  externalReference: string | null;
  notes: string | null;
  processedByUserId: string | null;
  processedByDisplayName: string | null;
  proof: PractitionerPayoutProof | null;
  createdAt: string;
};

export type PractitionerPayoutHistoryDetail = PractitionerPayoutHistoryItem & {
  settlement: PractitionerPayoutDueItem;
};

export type PractitionerPayoutHistoryListResponseData = {
  items: PractitionerPayoutHistoryItem[];
  pagination: Pagination;
};

export type SettlementDuesFinanceFilter = "all" | "with_due" | "with_balance" | "empty";

export type SettlementDuesVerificationFilter = "all" | "verified" | "unverified";

export type SettlementDuesSortBy = "due_desc" | "balance_desc" | "name_asc";

export type ListSettlementDuesDirectoryParams = {
  page?: number;
  limit?: number;
  search?: string;
  currencyCode?: string;
  finance?: SettlementDuesFinanceFilter;
  verification?: SettlementDuesVerificationFilter;
  sortBy?: SettlementDuesSortBy;
};

export type SettlementDuesDirectoryPractitioner = {
  id: string;
  slug: string;
  displayName: string | null;
  practitionerType: string;
  professionalTitle: string | null;
  countryCode: string | null;
  isVerified: boolean;
};

export type SettlementDuesDirectoryStats = {
  visibleCount: number;
  withDueCount: number;
  withBalanceCount: number;
  verifiedCount: number;
};

export type SettlementDuesDirectoryItem = {
  practitioner: SettlementDuesDirectoryPractitioner;
  summaries: PractitionerPayoutDueSummary[];
};

export type SettlementDuesDirectoryListResponseData = {
  items: SettlementDuesDirectoryItem[];
  pagination: Pagination;
  stats: SettlementDuesDirectoryStats;
};

export type AdminPayoutHistoryItem = PractitionerPayoutHistoryItem & {
  practitionerDisplayName: string | null;
  practitionerSlug: string | null;
};

export type AdminPayoutHistoryListResponseData = {
  items: AdminPayoutHistoryItem[];
  pagination: Pagination;
};

export type PractitionerPayoutDetailResponseData = {
  item: PractitionerPayoutHistoryDetail;
};

export type RecordPractitionerPayoutRequest = {
  settlementId: string;
  amountPaid: string;
  payoutMethod: SettlementPayoutMethod;
  payoutDate?: string;
  externalReference?: string;
  notes?: string;
};

export type RecordPractitionerPayoutResponseData = {
  item: PractitionerPayoutHistoryDetail;
};

export type UploadPractitionerPayoutProofResponseData = {
  item: PractitionerPayoutProof;
};

export type PractitionerStatementRowType = "EARNING" | "PAYOUT";

export type PractitionerStatementRowSourceType = "LEDGER" | "PAYOUT";

export type PractitionerStatementFilters = {
  currencyCode: string | null;
  rowType: "ALL" | PractitionerStatementRowType;
  effectiveFrom: string | null;
  effectiveTo: string | null;
};

export type PractitionerStatementPractitioner = {
  id: string;
  displayName: string | null;
  publicSlug: string | null;
  professionalTitle: string | null;
  countryCode: string | null;
};

export type PractitionerStatementRow = {
  id: string;
  rowType: PractitionerStatementRowType;
  sourceType: PractitionerStatementRowSourceType;
  effectiveAt: string;
  createdAt: string;
  currency: string;
  amount: string;
  paymentId: string | null;
  sessionId: string | null;
  settlementId: string | null;
  referenceType: string | null;
  referenceId: string | null;
  description: string | null;
  payoutMethod: SettlementPayoutMethod | null;
  payoutSource: SettlementPayoutSource | null;
  externalReference: string | null;
  notes: string | null;
  processedByUserId: string | null;
  processedByDisplayName: string | null;
  proofPresent: boolean;
};

export type PractitionerStatementCurrencySummary = {
  currency: string;
  rowCount: number;
  earningRowsCount: number;
  payoutRowsCount: number;
  earningTotal: string;
  payoutTotal: string;
  netTotal: string;
};

export type PractitionerStatementWalletSummary = {
  currency: string;
  availableBalance: string;
  pendingBalance: string;
  reservedBalance: string;
  totalEarned: string;
  lifetimePaidOut: string;
  lastLedgerEntryAt: string | null;
  updatedAt: string | null;
};

export type PractitionerStatementSummary = {
  rowCount: number;
  earningRowsCount: number;
  payoutRowsCount: number;
  earningTotal: string;
  payoutTotal: string;
  netTotal: string;
  firstActivityAt: string | null;
  lastActivityAt: string | null;
  currencySummaries: PractitionerStatementCurrencySummary[];
  walletSummaries: PractitionerStatementWalletSummary[];
};

export type PractitionerStatementResponseData = {
  practitioner: PractitionerStatementPractitioner;
  generatedAt: string;
  filters: PractitionerStatementFilters;
  summary: PractitionerStatementSummary;
  rows: PractitionerStatementRow[];
};

export type RevenueShareRuleItem = {
  ruleId: string;
  slug: string;
  platformRatePercent: string;
  practitionerRatePercent: string;
  updatedAt: string;
};

export type RevenueShareRulesItem = {
  local: RevenueShareRuleItem;
  crossBorder: RevenueShareRuleItem;
};

export type RevenueShareRulesResponseData = {
  item: RevenueShareRulesItem;
};

export type UpdateRevenueShareRulesRequest = {
  localPlatformRatePercent: string;
  localPractitionerRatePercent: string;
  crossBorderPlatformRatePercent: string;
  crossBorderPractitionerRatePercent: string;
};
