export type SettlementStatus = "DRAFT" | "UNDER_REVIEW" | "APPROVED" | "REJECTED" | "CREDITED" | "PAID_OUT" | "READY" | "PROCESSING" | "PAID" | "FAILED" | "CANCELLED";
export type SettlementAdjustmentType = "PLATFORM_FEE" | "ADMINISTRATIVE_FEE" | "TAX" | "MANUAL_CORRECTION";
export type AddSettlementAdjustmentPayload = { type: SettlementAdjustmentType; amount: string; reason: string };
export type RecordPractitionerPayoutRequest = { settlementId: string; amountPaid: string; payoutMethod: "MANUAL_BANK_TRANSFER" | "WALLET_TRANSFER" | "CASH" | "OTHER"; payoutDate?: string; transferredAt?: string; externalReference?: string; notes?: string; transferFeeAmount?: string; transferFeeTreatment?: "PLATFORM_EXPENSE" | "DEDUCT_FROM_PRACTITIONER" };

export type ListAdminSettlementsParams = {
  page?: number;
  limit?: number;
  query?: string;
  status?: SettlementStatus;
  currency?: string;
  practitionerId?: string;
  country?: string;
  createdFrom?: string;
  createdTo?: string;
  sortBy?: "createdAt" | "amount" | "practitionerName";
  sortDirection?: "asc" | "desc";
};

export type Pagination = { page: number; limit: number; totalItems: number; totalPages: number };
export type SettlementMoney = string | null;

export type SettlementListItem = {
  id: string;
  status: SettlementStatus;
  practitioner: { id: string; name: string | null; country: string | null; countryCode?: string | null; walletCurrency: string };
  session: { id: string; date: string | null; patientName: string | null; sessionCode?: string | null; type?: string | null; status?: string | null } | null;
  originalAmount: SettlementMoney;
  originalCurrency: string;
  grossPractitionerAmount: SettlementMoney;
  adjustmentsTotal: SettlementMoney;
  finalWalletCredit: SettlementMoney;
  amountPaidTotal: SettlementMoney;
  createdAt: string;
  updatedAt: string;
  currency: string;
  originalCurrencyCode: string;
  walletCurrencyCode: string;
  exchangeRate: SettlementMoney;
  exchangeRateSource: string | null;
  exchangeRateDate: string | null;
  convertedAmount: SettlementMoney;
  approvedByUserId?: string | null;
  approvedAt?: string | null;
  rejectionReason?: string | null;
  rejectedByUserId?: string | null;
  rejectedAt?: string | null;
};

export type SettlementAdjustment = { id: string; type: SettlementAdjustmentType; amount: SettlementMoney; currency: string; reason: string; createdByUserId: string; createdAt: string };
export type SettlementAuditEvent = { id: string; action: string; outcome: string; occurredAt: string; reason: string | null; actorUser: { id: string; displayName: string | null } | null };
export type SettlementPayoutRecord = { id: string; amountPaid: SettlementMoney; currency: string; payoutCurrency?: string | null; transferFeeAmount?: SettlementMoney; transferFeeCurrency?: string | null; feeBearer?: "PLATFORM_EXPENSE" | "DEDUCT_FROM_PRACTITIONER"; netAmountReceived?: SettlementMoney; totalPlatformOutflow?: SettlementMoney; payoutMethod: string; externalPayoutRef: string | null; notes: string | null; actorUserId: string | null; actorType: string | null; executor?: { id: string; name: string | null } | null; effectiveAt: string; createdAt: string };
export type SettlementPayment = { id: string; reference: string | null; status: string; provider: string; currency: string; amount: SettlementMoney; capturedAt: string | null };
export type SettlementDetail = SettlementListItem & {
  updatedAt: string;
  financial: { originalAmount: SettlementMoney; originalCurrency: string; walletCurrency: string; exchangeRate: SettlementMoney; exchangeRateSource: string | null; exchangeRateDate: string | null; convertedAmount: SettlementMoney; finalWalletCredit: SettlementMoney; walletCreditDifferenceAmount?: SettlementMoney; walletCreditOverrideReason?: string | null; grossPractitionerAmount: SettlementMoney; adjustmentsTotal: SettlementMoney; platformCommissionRatePercent?: SettlementMoney; platformCommissionAmount?: SettlementMoney; platformCommissionCurrency?: string };
  payment: SettlementPayment | null;
  approvedBy?: { id: string; name: string | null } | null;
  rejectedBy?: { id: string; name: string | null } | null;
  adjustments: SettlementAdjustment[];
  auditEvents: SettlementAuditEvent[];
  session: (SettlementListItem["session"] & { patient?: { displayName: string | null } | null }) | null;
  patient: { displayName: string | null } | null;
  payoutRecords: SettlementPayoutRecord[];
};

export type SettlementListResponse = { items: SettlementListItem[]; pagination: Pagination };
export type SettlementDetailResponse = { item: SettlementDetail };
