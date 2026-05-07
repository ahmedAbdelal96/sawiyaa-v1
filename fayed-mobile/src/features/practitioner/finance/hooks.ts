import { useQuery } from "@tanstack/react-query";
import { useAuthenticatedQueryEnabled } from "../../auth/query-auth";
import {
  getPractitionerLedgerEntries,
  getPractitionerSettlementItems,
  getPractitionerWalletSummary,
} from "./api";
import type {
  PractitionerLedgerListParams,
  PractitionerSettlementListParams,
} from "./types";

export const practitionerFinanceQueryKeys = {
  all: ["practitioner-finance"] as const,
  wallet: () => [...practitionerFinanceQueryKeys.all, "wallet"] as const,
  ledger: (params?: PractitionerLedgerListParams) =>
    [...practitionerFinanceQueryKeys.all, "ledger", params ?? {}] as const,
  settlements: (params?: PractitionerSettlementListParams) =>
    [
      ...practitionerFinanceQueryKeys.all,
      "settlements",
      params ?? {},
    ] as const,
};

export function usePractitionerWalletSummary() {
  const enabled = useAuthenticatedQueryEnabled("practitioner");

  return useQuery({
    queryKey: practitionerFinanceQueryKeys.wallet(),
    queryFn: getPractitionerWalletSummary,
    enabled,
    staleTime: 30_000,
  });
}

export function usePractitionerLedgerEntries(params?: PractitionerLedgerListParams) {
  const enabled = useAuthenticatedQueryEnabled("practitioner");

  return useQuery({
    queryKey: practitionerFinanceQueryKeys.ledger(params),
    queryFn: () => getPractitionerLedgerEntries(params),
    enabled,
    staleTime: 20_000,
  });
}

export function usePractitionerSettlementItems(
  params?: PractitionerSettlementListParams,
) {
  const enabled = useAuthenticatedQueryEnabled("practitioner");

  return useQuery({
    queryKey: practitionerFinanceQueryKeys.settlements(params),
    queryFn: () => getPractitionerSettlementItems(params),
    enabled,
    staleTime: 20_000,
  });
}
