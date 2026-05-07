import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthenticatedQueryEnabled } from "../../auth/query-auth";
import { patientSessionsQueryKeys } from "../sessions/hooks";
import {
  getPatientSessionPaymentCapabilities,
  getPatientPayment,
  getPatientWalletSummary,
  reconcileSessionPaymentReturn,
  getSessionFinancialBreakdown,
  initiateSessionPayment,
  listPatientPayments,
  listPatientWalletEntries,
} from "./api";
import type {
  InitiateSessionPaymentInput,
  ListPaymentsParams,
  ListWalletEntriesParams,
  PaymentReconcileSessionReturnInput,
} from "./types";

export const paymentQueryKeys = {
  all: ["patient-payments"] as const,
  list: (params?: ListPaymentsParams) =>
    [...paymentQueryKeys.all, "list", params ?? {}] as const,
  detail: (paymentId: string) =>
    [...paymentQueryKeys.all, "detail", paymentId] as const,
  walletSummary: (currencyCode?: string) =>
    [
      ...paymentQueryKeys.all,
      "wallet-summary",
      currencyCode ?? "default",
    ] as const,
  walletEntries: (params?: ListWalletEntriesParams) =>
    [...paymentQueryKeys.all, "wallet-entries", params ?? {}] as const,
  capabilities: (sessionId: string) =>
    [...paymentQueryKeys.all, "capabilities", sessionId] as const,
  financialBreakdown: (sessionId: string, couponCode?: string | null) =>
    [
      ...paymentQueryKeys.all,
      "breakdown",
      sessionId,
      couponCode ?? null,
    ] as const,
};

export function usePatientPayments(params?: ListPaymentsParams) {
  const enabled = useAuthenticatedQueryEnabled("patient");

  return useQuery({
    queryKey: paymentQueryKeys.list(params),
    queryFn: () => listPatientPayments(params),
    enabled,
    staleTime: 30_000,
  });
}

export function usePatientPayment(paymentId: string | null) {
  const enabled = useAuthenticatedQueryEnabled("patient");

  return useQuery({
    queryKey: paymentQueryKeys.detail(paymentId ?? ""),
    queryFn: () => getPatientPayment(paymentId!),
    enabled: enabled && Boolean(paymentId),
    staleTime: 30_000,
  });
}

export function usePatientWalletSummary(currencyCode?: string) {
  const enabled = useAuthenticatedQueryEnabled("patient");

  return useQuery({
    queryKey: paymentQueryKeys.walletSummary(currencyCode),
    queryFn: () => getPatientWalletSummary(currencyCode),
    enabled,
    staleTime: 30_000,
  });
}

export function usePatientWalletEntries(params?: ListWalletEntriesParams) {
  const enabled = useAuthenticatedQueryEnabled("patient");

  return useQuery({
    queryKey: paymentQueryKeys.walletEntries(params),
    queryFn: () => listPatientWalletEntries(params),
    enabled,
    staleTime: 30_000,
  });
}

export function usePatientSessionPaymentCapabilities(sessionId: string | null) {
  const enabled = useAuthenticatedQueryEnabled("patient");

  return useQuery({
    queryKey: paymentQueryKeys.capabilities(sessionId ?? ""),
    queryFn: () => getPatientSessionPaymentCapabilities(sessionId!),
    enabled: enabled && Boolean(sessionId),
    staleTime: 60_000,
  });
}

export function useSessionFinancialBreakdown(
  sessionId: string | null,
  couponCode?: string | null,
) {
  const enabled = useAuthenticatedQueryEnabled("patient");

  return useQuery({
    queryKey: paymentQueryKeys.financialBreakdown(sessionId ?? "", couponCode),
    queryFn: () => getSessionFinancialBreakdown(sessionId!, couponCode),
    enabled: enabled && Boolean(sessionId),
    staleTime: 60_000,
    retry: 1,
  });
}

export function useInitiateSessionPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      sessionId,
      input,
    }: {
      sessionId: string;
      input: InitiateSessionPaymentInput;
    }) => initiateSessionPayment(sessionId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: paymentQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: patientSessionsQueryKeys.all });
    },
  });
}

export function useReconcileSessionPaymentReturn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      sessionId,
      input,
    }: {
      sessionId: string;
      input: PaymentReconcileSessionReturnInput;
    }) => reconcileSessionPaymentReturn(sessionId, input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: paymentQueryKeys.all });
      queryClient.invalidateQueries({
        queryKey: patientSessionsQueryKeys.details(variables.sessionId),
      });
    },
  });
}
