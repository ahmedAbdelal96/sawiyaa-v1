export type PractitionerWallet = {
  currency: string;
  pendingBalance: string;
  availableBalance: string;
  reservedBalance: string;
  totalEarned: string;
  lifetimePaidOut: string;
  manualRecoveryAmount: string;
  lastLedgerEntryAt: string | null;
  updatedAt: string | null;
};

export type PractitionerWalletResponse = {
  item: PractitionerWallet;
};

export type LedgerEntryType =
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

export type LedgerDirection = "CREDIT" | "DEBIT";

export type WalletBalanceBucket = "AVAILABLE" | "PENDING" | "RESERVED";

export type PractitionerLedgerEntry = {
  id: string;
  entryType: LedgerEntryType;
  direction: LedgerDirection;
  amount: string;
  currency: string;
  balanceBucket: WalletBalanceBucket;
  paymentId: string | null;
  sessionId: string | null;
  sessionCode: string | null;
  settlementId: string | null;
  referenceType: string | null;
  referenceId: string | null;
  description: string | null;
  createdAt: string;
  effectiveAt: string;
};

export type Pagination = {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
};

export type PractitionerLedgerListResponse = {
  items: PractitionerLedgerEntry[];
  pagination: Pagination;
};

export type PractitionerLedgerListParams = {
  page?: number;
  limit?: number;
  entryType?: LedgerEntryType;
  balanceBucket?: WalletBalanceBucket;
  currencyCode?: string;
  referenceType?: string;
  paymentId?: string;
  settlementId?: string;
  effectiveFrom?: string;
  effectiveTo?: string;
};

export type PractitionerSettlementStatus =
  | "DRAFT"
  | "UNDER_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "CREDITED"
  | "PAID_OUT"
  | "READY"
  | "PROCESSING"
  | "PAID"
  | "FAILED"
  | "CANCELLED";

export type PractitionerSettlementItem = {
  status: PractitionerSettlementStatus;
  currency: string;
  amountAdded: string;
  payoutStatus: "PENDING" | "PAID" | "NOT_ELIGIBLE";
  sessionId: string | null;
  sessionCode: string | null;
  date: string | null;
  sessionType: string | null;
};

export type PractitionerSettlementListResponse = {
  items: PractitionerSettlementItem[];
  pagination: Pagination;
};

export type PractitionerSettlementListParams = {
  page?: number;
  limit?: number;
  status?: PractitionerSettlementStatus;
  currencyCode?: string;
  createdFrom?: string;
  createdTo?: string;
};
