import type { ListAdminPractitionerManualPayoutsParams } from "../types/admin-practitioner-payouts.types";
import type { ListAdminPractitionerManualPayoutHistoryParams } from "../types/admin-practitioner-payouts.types";
import type { ListAdminPractitionerPayoutSummariesParams } from "../types/admin-practitioner-payouts.types";

export const adminPractitionerPayoutsQueryKeys = {
  all: ["admin-practitioner-payouts"] as const,
  balance: (practitionerId: string, currency: string) =>
    [...adminPractitionerPayoutsQueryKeys.all, "balance", practitionerId, currency] as const,
  summaries: (params?: ListAdminPractitionerPayoutSummariesParams) =>
    [...adminPractitionerPayoutsQueryKeys.all, "summaries", params ?? {}] as const,
  payouts: (practitionerId: string, params?: ListAdminPractitionerManualPayoutsParams) =>
    [...adminPractitionerPayoutsQueryKeys.all, "payouts", practitionerId, params ?? {}] as const,
  history: (params?: ListAdminPractitionerManualPayoutHistoryParams) =>
    [...adminPractitionerPayoutsQueryKeys.all, "history", params ?? {}] as const,
};
