import { useMutation, useQuery } from "@tanstack/react-query";
import {
  getPatientPayment,
  getPatientPayments,
  initiateSessionPayment,
} from "../api/payments.api";
import type {
  InitiateSessionPaymentInput,
  ListPaymentsParams,
} from "../types/payments.types";

export const paymentQueryKeys = {
  all: ["payments"] as const,
  list: (params?: ListPaymentsParams) =>
    [...paymentQueryKeys.all, "list", params ?? {}] as const,
  detail: (paymentId: string) => [...paymentQueryKeys.all, paymentId] as const,
};

/**
 * Fetches the patient's payment history list with optional filter and pagination.
 */
export function usePatientPayments(params?: ListPaymentsParams) {
  return useQuery({
    queryKey: paymentQueryKeys.list(params),
    queryFn: () => getPatientPayments(params),
    staleTime: 30_000,
  });
}

/**
 * Initiates payment for a session.
 * Call mutate({ sessionId, input }) to trigger.
 */
export function useInitiateSessionPayment() {
  return useMutation({
    mutationFn: ({
      sessionId,
      input,
    }: {
      sessionId: string;
      input: InitiateSessionPaymentInput;
    }) => initiateSessionPayment(sessionId, input),
  });
}

/**
 * Fetches a single patient-owned payment by ID.
 */
export function usePatientPayment(paymentId: string | null) {
  return useQuery({
    queryKey: paymentQueryKeys.detail(paymentId ?? ""),
    queryFn: () => getPatientPayment(paymentId!),
    enabled: Boolean(paymentId),
    staleTime: 30_000,
  });
}
