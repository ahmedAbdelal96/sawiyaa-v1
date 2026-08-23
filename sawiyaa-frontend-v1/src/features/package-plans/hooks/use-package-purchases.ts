import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale } from "next-intl";
import {
  createPatientPackagePurchase,
  getMyPackagePurchase,
  initiatePatientPackagePurchasePayment,
  listMyPackagePurchasesWithParams,
} from "../api/package-purchases.api";
import type {
  CreatePatientPackagePurchaseRequest,
  ListMyPackagePurchasesParams,
  InitiatePatientPackagePurchasePaymentInput,
} from "../types/package-purchases.types";

export const packagePurchaseQueryKeys = {
  all: ["package-purchases"] as const,
  list: (params?: ListMyPackagePurchasesParams, locale?: string) =>
    [...packagePurchaseQueryKeys.all, "list", locale ?? "en", params ?? {}] as const,
  detail: (purchaseId: string, locale?: string) =>
    [...packagePurchaseQueryKeys.all, purchaseId, locale ?? "en"] as const,
};

export function useMyPackagePurchases(params?: ListMyPackagePurchasesParams) {
  const locale = useLocale();

  return useQuery({
    queryKey: packagePurchaseQueryKeys.list(params, locale),
    queryFn: () => listMyPackagePurchasesWithParams(params),
    staleTime: 30_000,
  });
}

export function useMyPackagePurchase(purchaseId: string | null) {
  const locale = useLocale();

  return useQuery({
    queryKey: packagePurchaseQueryKeys.detail(purchaseId ?? "", locale),
    queryFn: () => getMyPackagePurchase(purchaseId!),
    enabled: Boolean(purchaseId),
    staleTime: 30_000,
  });
}

export function useCreatePackagePurchase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreatePatientPackagePurchaseRequest) => createPatientPackagePurchase(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: packagePurchaseQueryKeys.all });
    },
  });
}

export function useInitiatePackagePurchasePayment() {
  const queryClient = useQueryClient();
  const locale = useLocale();
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
      queryClient.invalidateQueries({ queryKey: packagePurchaseQueryKeys.detail(purchaseId, locale) });
      queryClient.invalidateQueries({ queryKey: packagePurchaseQueryKeys.all });
    },
  });
}
