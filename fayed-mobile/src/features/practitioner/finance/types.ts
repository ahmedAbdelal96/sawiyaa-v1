export type PractitionerLedgerEntryType =
  | "SESSION_GROSS"
  | "PLATFORM_COMMISSION"
  | "PRACTITIONER_EARNING"
  | "COUPON_PLATFORM_SHARE"
  | "COUPON_PRACTITIONER_SHARE"
  | "REFUND_PLATFORM_REVERSAL"
  | "REFUND_PRACTITIONER_REVERSAL"
  | "MANUAL_ADJUSTMENT"
  | "SETTLEMENT_PAYOUT"
  | "SETTLEMENT_REVERSAL";

export type PractitionerLedgerDirection = "CREDIT" | "DEBIT";

export type PractitionerLedgerBalanceBucket =
  | "AVAILABLE"
  | "PENDING"
  | "RESERVED";

export interface PractitionerWalletSummary {
  currency: string;
  pendingBalance: string;
  availableBalance: string;
  reservedBalance: string;
  totalEarned: string;
  lifetimePaidOut: string;
  lastLedgerEntryAt: string | null;
  updatedAt: string | null;
}

export interface PractitionerWalletResponse {
  item: PractitionerWalletSummary;
}

export interface PractitionerLedgerEntry {
  id: string;
  entryType: PractitionerLedgerEntryType;
  direction: PractitionerLedgerDirection;
  amount: string;
  currency: string;
  balanceBucket: PractitionerLedgerBalanceBucket;
  paymentId: string | null;
  sessionId: string | null;
  settlementId: string | null;
  referenceType: string | null;
  referenceId: string | null;
  description: string | null;
  createdAt: string;
  effectiveAt: string;
}

export interface PractitionerPagination {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

export interface PractitionerLedgerListResponse {
  items: PractitionerLedgerEntry[];
  pagination: PractitionerPagination;
}

export interface PractitionerLedgerListParams {
  page?: number;
  limit?: number;
}

export type PractitionerSettlementStatus =
  | "DRAFT"
  | "READY"
  | "PROCESSING"
  | "PAID"
  | "FAILED"
  | "CANCELLED";

export type PractitionerSettlementBatchStatus =
  | "DRAFT"
  | "READY"
  | "PROCESSING"
  | "PAID"
  | "FAILED"
  | "CANCELLED";

export interface PractitionerSettlementItem {
  id: string;
  batchId: string;
  batchSlug: string;
  batchPeriodYear: number;
  batchPeriodMonth: number;
  batchStatus: PractitionerSettlementBatchStatus;
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
}

export interface PractitionerSettlementListResponse {
  items: PractitionerSettlementItem[];
  pagination: PractitionerPagination;
}

export interface PractitionerSettlementListParams {
  page?: number;
  limit?: number;
}
