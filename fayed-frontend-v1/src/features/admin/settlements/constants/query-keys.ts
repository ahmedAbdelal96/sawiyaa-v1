import type { ListSettlementBatchesParams } from "../types/admin-settlements.types";
import type { ListSettlementDuesDirectoryParams } from "../types/admin-settlements.types";

export const adminSettlementsQueryKeys = {
  all: ["admin-settlements"] as const,
  list: (params?: ListSettlementBatchesParams) =>
    [...adminSettlementsQueryKeys.all, "list", params ?? {}] as const,
  duesDirectory: (params?: ListSettlementDuesDirectoryParams) =>
    [...adminSettlementsQueryKeys.all, "dues-directory", params ?? {}] as const,
  details: (id: string) =>
    [...adminSettlementsQueryKeys.all, "detail", id] as const,
  practitionerSettlements: (
    practitionerId: string,
    params?: Record<string, unknown>,
  ) =>
    [...adminSettlementsQueryKeys.all, "practitioner-settlements", practitionerId, params ?? {}] as const,
  practitionerPayouts: (
    practitionerId: string,
    params?: Record<string, unknown>,
  ) =>
    [...adminSettlementsQueryKeys.all, "practitioner-payouts", practitionerId, params ?? {}] as const,
  practitionerPayoutDues: (
    practitionerId: string,
    params?: Record<string, unknown>,
  ) =>
    [...adminSettlementsQueryKeys.all, "practitioner-payout-dues", practitionerId, params ?? {}] as const,
  practitionerPayoutHistory: (
    practitionerId: string,
    params?: Record<string, unknown>,
  ) =>
    [...adminSettlementsQueryKeys.all, "practitioner-payout-history", practitionerId, params ?? {}] as const,
  payoutHistory: (params?: Record<string, unknown>) =>
    [...adminSettlementsQueryKeys.all, "payout-history", params ?? {}] as const,
  practitionerPayoutDetail: (practitionerId: string, payoutId: string) =>
    [...adminSettlementsQueryKeys.all, "practitioner-payout-detail", practitionerId, payoutId] as const,
  practitionerStatement: (
    practitionerId: string,
    params?: Record<string, unknown>,
  ) =>
    [...adminSettlementsQueryKeys.all, "practitioner-statement", practitionerId, params ?? {}] as const,
};
