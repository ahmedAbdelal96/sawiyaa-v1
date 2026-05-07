import type { SettlementPayoutMethod } from "../../settlements/types/admin-settlements.types";

export type AdminPractitionerPayoutBalance = {
  practitionerId: string;
  practitionerName: string | null;
  currencyCode: string;
  normalSessionPayableAmount: string;
  packageReleasedPayableAmount: string;
  packageHeldAmount: string;
  totalPayableAmount: string;
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
  payoutMethod: SettlementPayoutMethod;
  transferReference: string | null;
  paidAt: string;
  notes: string | null;
  recordedByUserId: string | null;
  recordedByDisplayName: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AdminPractitionerPayoutSummary = {
  practitionerId: string;
  practitionerName: string | null;
  practitionerSlug: string | null;
  egp: AdminPractitionerPayoutBalance;
  usd: AdminPractitionerPayoutBalance;
  hasPayable: boolean;
  hasPackage: boolean;
  lastPayoutAt: string | null;
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
  payoutMethod?: SettlementPayoutMethod;
  createdFrom?: string;
  createdTo?: string;
};

export type ListAdminPractitionerManualPayoutHistoryParams = {
  page?: number;
  limit?: number;
  practitionerId?: string;
  currency?: string;
  payoutMethod?: SettlementPayoutMethod;
  createdFrom?: string;
  createdTo?: string;
};

export type AdminPractitionerPayoutBalanceResponseData = {
  item: AdminPractitionerPayoutBalance;
};

export type AdminPractitionerManualPayoutListResponseData = {
  items: AdminPractitionerManualPayout[];
  pagination: Pagination;
};

export type AdminPractitionerPayoutSummaryListResponseData = {
  items: AdminPractitionerPayoutSummary[];
  pagination: Pagination;
};

export type AdminPractitionerManualPayoutHistoryListResponseData =
  AdminPractitionerManualPayoutListResponseData;

export type ListAdminPractitionerPayoutSummariesParams = {
  page?: number;
  limit?: number;
  search?: string;
};

export type RecordAdminPractitionerManualPayoutRequest = {
  practitionerId: string;
  currencyCode: string;
  amountPaid: string;
  paidAt?: string;
  paymentMethod?: SettlementPayoutMethod;
  transferReference?: string;
  notes?: string;
};

export type RecordAdminPractitionerManualPayoutResponseData = {
  item: AdminPractitionerManualPayout;
};
