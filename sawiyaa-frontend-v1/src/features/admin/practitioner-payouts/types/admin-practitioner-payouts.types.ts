import type { PayoutMethod } from "../../finance/types/payout-method";
import type { PractitionerPayoutDestination } from "@/features/practitioners/types/practitioners.types";

export type AdminPractitionerPayoutBalance = {
  practitionerId: string;
  practitionerName: string | null;
  currencyCode: string;
  payoutDestinationSnapshot: PractitionerPayoutDestination | null;
  payoutDestinationType: string | null;
  payoutDestinationSummaryMasked: string | null;
  normalSessionPayableAmount: string;
  packageReleasedPayableAmount: string;
  packageHeldAmount: string;
  totalPayableAmount: string;
  manualRecoveryAmount: string;
  lastPayoutAt: string | null;
};

export type AdminPractitionerManualPayout = {
  id: string;
  practitionerId: string;
  practitionerName: string | null;
  currencyCode: string;
  amountPaid: string;
  normalSessionAppliedAmount: string;
  packageReleasedAppliedAmount: string;
  packageHeldAmountSnapshot: string;
  totalPayableSnapshot: string;
  payoutMethod: PayoutMethod;
  transferReference: string | null;
  paidAt: string;
  notes: string | null;
  recordedByUserId: string | null;
  recordedByDisplayName: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AdminPractitionerManualPayoutHistorySummary = {
  payoutCount: number;
  egpAmountPaid: string;
  usdAmountPaid: string;
};

export type AdminPractitionerPayoutSummary = {
  practitionerId: string;
  practitionerName: string | null;
  practitionerSlug: string | null;
  safeDisplayCode: string;
  avatarUrl: string | null;
  primarySpecialtyName: string | null;
  payoutDestinationType: string | null;
  payoutDestinationSummaryMasked: string | null;
  egp: AdminPractitionerPayoutBalance;
  usd: AdminPractitionerPayoutBalance;
  hasPayable: boolean;
  hasPackage: boolean;
  lastPayoutAt: string | null;
};

export type AdminPractitionerPayoutSummaryStats = {
  practitionersWithDues: number;
  readyForPayoutPractitioners: number;
  totalDueEgp: string;
  totalDueUsd: string;
};

export type Pagination = {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
};

export type ListAdminPractitionerManualPayoutsParams = {
  page?: number;
  limit?: number;
  currency?: string;
  payoutMethod?: PayoutMethod;
  createdFrom?: string;
  createdTo?: string;
};

export type ListAdminPractitionerManualPayoutHistoryParams = {
  page?: number;
  limit?: number;
  practitionerId?: string;
  currency?: string;
  payoutMethod?: PayoutMethod;
  createdFrom?: string;
  createdTo?: string;
};

export type AdminPractitionerPayoutBalanceResponseData = {
  item: AdminPractitionerPayoutBalance;
};

export type AdminPractitionerManualPayoutListResponseData = {
  items: AdminPractitionerManualPayout[];
  pagination: Pagination;
  summary: AdminPractitionerManualPayoutHistorySummary;
};

export type AdminPractitionerPayoutSummaryListResponseData = {
  items: AdminPractitionerPayoutSummary[];
  summary: AdminPractitionerPayoutSummaryStats;
  pagination: Pagination;
};

export type AdminPractitionerManualPayoutHistoryListResponseData =
  AdminPractitionerManualPayoutListResponseData;

export type ListAdminPractitionerPayoutSummariesParams = {
  page?: number;
  limit?: number;
  search?: string;
};

export type AdminPractitionerWalletListItem = {
  walletId: string;
  practitionerId: string;
  practitionerReference: string | null;
  practitionerName: string | null;
  practitionerEmail: string | null;
  currencyCode: string;
  availableBalance: string;
  totalCredited: string;
  totalExternallyTransferred: string;
  latestActivityType: string | null;
  latestActivityAt: string | null;
  updatedAt: string;
};
export type AdminPractitionerWalletListResponseData = { items: AdminPractitionerWalletListItem[]; pagination: Pagination };
export type ListAdminPractitionerWalletsParams = { page?: number; limit?: number; search?: string; currencyCode?: string; sortBy?: "latestActivity" | "balance" | "name"; sortDirection?: "asc" | "desc" };
export type AdminPractitionerWalletDetail = {
  practitioner: { id: string; reference: string | null; name: string | null; email: string | null };
  wallet: { id: string; currencyCode: string; status: string; availableBalance: string; totalCredited: string; totalExternallyTransferred: string; latestActivityAt: string | null; updatedAt: string };
  recentLedgerEntries: Array<{ id: string; type: string; amount: string; direction: "CREDIT" | "DEBIT"; currencyCode: string; settlementId: string | null; sessionId: string | null; sessionCode: string | null; sessionReference: string | null; effectiveAt: string; createdAt: string; createdBy: string | null }>;
  recentSettlements: Array<{ id: string; settlementReference: string; sessionId: string | null; sessionCode: string | null; sessionReference: string | null; amountCredited: string; currencyCode: string; status: string; approvedAt: string | null }>;
  recentTransfers: Array<{ id: string; transferReference: string; settlementId: string; settlementReference: string; sessionCode: string | null; sessionReference: string | null; amount: string; currencyCode: string; transferMethod: string; externalReference: string | null; transferredAt: string; executedBy: string | null; status: string }>;
};
export type AdminPractitionerWalletDetailResponseData = AdminPractitionerWalletDetail;

export type RecordAdminPractitionerManualPayoutRequest = {
  practitionerId: string;
  currencyCode: string;
  amountPaid: string;
  paidAt?: string;
  paymentMethod?: PayoutMethod;
  transferReference?: string;
  notes?: string;
};

export type RecordAdminPractitionerManualPayoutResponseData = {
  item: AdminPractitionerManualPayout;
};
