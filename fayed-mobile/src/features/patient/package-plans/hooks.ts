import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthenticatedQueryEnabled } from "../../auth/query-auth";
import type { RefundPolicyType } from "../refund-policies/types";
import {
  createPatientPackagePurchase,
  fetchPublicPractitionerPackagePlans,
  fetchRefundPolicy,
  getMyPackagePurchase,
  initiatePatientPackagePurchasePayment,
  listMyPackagePurchases,
  quotePatientPackagePlan,
} from "./api";
import type {
  CreatePatientPackagePurchaseRequest,
  InitiatePatientPackagePurchasePaymentInput,
  ListMyPackagePurchasesParams,
  PackagePlansQuery,
  PatientPackagePlanQuoteRequest,
} from "./types";

export const packagePlanQueryKeys = {
  all: ["package-plans"] as const,
  practitioner: (slug: string, params?: PackagePlansQuery) =>
    [...packagePlanQueryKeys.all, "practitioner", slug, params ?? {}] as const,
  quote: (input: PatientPackagePlanQuoteRequest) =>
    [...packagePlanQueryKeys.all, "quote", input] as const,
};

export const packagePurchaseQueryKeys = {
  all: ["package-purchases"] as const,
  list: (params?: ListMyPackagePurchasesParams) =>
    [...packagePurchaseQueryKeys.all, "list", params ?? {}] as const,
  detail: (purchaseId: string) => [...packagePurchaseQueryKeys.all, purchaseId] as const,
};

export const refundPolicyQueryKeys = {
  all: ["refund-policies"] as const,
  detail: (policyType: RefundPolicyType) =>
    [...refundPolicyQueryKeys.all, policyType] as const,
};

export function usePublicPractitionerPackagePlans(
  practitionerSlug: string | null,
  params?: PackagePlansQuery,
) {
  return useQuery({
    queryKey: packagePlanQueryKeys.practitioner(practitionerSlug ?? "", params),
    queryFn: () => fetchPublicPractitionerPackagePlans(practitionerSlug!, params),
    enabled: Boolean(practitionerSlug),
    staleTime: 60_000,
  });
}

export function usePackagePlanQuote(input: PatientPackagePlanQuoteRequest | null) {
  return useQuery({
    queryKey: input ? packagePlanQueryKeys.quote(input) : packagePlanQueryKeys.all,
    queryFn: () => quotePatientPackagePlan(input!),
    enabled: Boolean(input),
    staleTime: 60_000,
  });
}

export function useMyPackagePurchases(params?: ListMyPackagePurchasesParams) {
  const enabled = useAuthenticatedQueryEnabled("patient");

  return useQuery({
    queryKey: packagePurchaseQueryKeys.list(params),
    queryFn: () => listMyPackagePurchases(params),
    enabled,
    staleTime: 30_000,
  });
}

export function useMyPackagePurchase(purchaseId: string | null) {
  const enabled = useAuthenticatedQueryEnabled("patient");

  return useQuery({
    queryKey: packagePurchaseQueryKeys.detail(purchaseId ?? ""),
    queryFn: () => getMyPackagePurchase(purchaseId!),
    enabled: enabled && Boolean(purchaseId),
    staleTime: 30_000,
  });
}

export function useCreatePackagePurchase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreatePatientPackagePurchaseRequest) =>
      createPatientPackagePurchase(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: packagePurchaseQueryKeys.all });
    },
  });
}

export function useInitiatePackagePurchasePayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      purchaseId,
      input,
    }: {
      purchaseId: string;
      input: InitiatePatientPackagePurchasePaymentInput;
    }) => initiatePatientPackagePurchasePayment(purchaseId, input),
    onSuccess: (_, variables) => {
      const { purchaseId } = variables;
      queryClient.invalidateQueries({ queryKey: packagePurchaseQueryKeys.detail(purchaseId) });
      queryClient.invalidateQueries({ queryKey: packagePurchaseQueryKeys.all });
    },
  });
}

export function usePackageRefundPolicy(
  policyType: RefundPolicyType,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: refundPolicyQueryKeys.detail(policyType),
    queryFn: () => fetchRefundPolicy(policyType),
    enabled: options?.enabled ?? true,
    staleTime: 5 * 60_000,
  });
}
