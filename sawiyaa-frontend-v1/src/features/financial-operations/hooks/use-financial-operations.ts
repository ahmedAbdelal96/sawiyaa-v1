"use client";

import { useQuery } from "@tanstack/react-query";
import {
  getPractitionerLedger,
  getPractitionerSettlements,
  getPractitionerWallet,
} from "../api/financial-operations.api";
import { financialOperationsQueryKeys } from "../constants/query-keys";
import type {
  PractitionerLedgerListParams,
  PractitionerSettlementListParams,
} from "../types/financial-operations.types";

export function usePractitionerWallet() {
  return useQuery({
    queryKey: financialOperationsQueryKeys.practitionerWallet(),
    queryFn: getPractitionerWallet,
    staleTime: 30_000,
  });
}

export function usePractitionerLedger(params: PractitionerLedgerListParams) {
  return useQuery({
    queryKey: financialOperationsQueryKeys.practitionerLedger(params),
    queryFn: () => getPractitionerLedger(params),
    staleTime: 15_000,
  });
}

export function usePractitionerSettlements(params: PractitionerSettlementListParams) {
  return useQuery({
    queryKey: financialOperationsQueryKeys.practitionerSettlements(params),
    queryFn: () => getPractitionerSettlements(params),
    staleTime: 15_000,
  });
}
