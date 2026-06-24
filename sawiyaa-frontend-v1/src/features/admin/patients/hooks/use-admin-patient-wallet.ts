"use client";

import { useQuery } from "@tanstack/react-query";
import {
  getAdminPatientWalletEntries,
  getAdminPatientWalletSummary,
} from "../api/admin-patient-wallet.api";
import type { ListCustomerWalletEntriesParams } from "@/features/payments/types/payments.types";

export const adminPatientWalletQueryKeys = {
  all: (patientId: string) => ["admin", "patients", patientId, "wallet"] as const,
  summary: (patientId: string, currencyCode?: string) =>
    [...adminPatientWalletQueryKeys.all(patientId), "summary", currencyCode ?? "default"] as const,
  entries: (patientId: string, params?: ListCustomerWalletEntriesParams) =>
    [...adminPatientWalletQueryKeys.all(patientId), "entries", params ?? {}] as const,
};

export function useAdminPatientWalletSummary(
  patientId: string | null,
  currencyCode?: string,
  enabled = true,
) {
  return useQuery({
    queryKey: adminPatientWalletQueryKeys.summary(patientId ?? "", currencyCode),
    queryFn: () => getAdminPatientWalletSummary(patientId!, currencyCode),
    enabled: Boolean(patientId) && enabled,
    staleTime: 30_000,
  });
}

export function useAdminPatientWalletEntries(
  patientId: string | null,
  params?: ListCustomerWalletEntriesParams,
  enabled = true,
) {
  return useQuery({
    queryKey: adminPatientWalletQueryKeys.entries(patientId ?? "", params),
    queryFn: () => getAdminPatientWalletEntries(patientId!, params),
    enabled: Boolean(patientId) && enabled,
    staleTime: 15_000,
  });
}

