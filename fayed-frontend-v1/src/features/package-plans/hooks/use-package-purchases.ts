import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
  list: (params?: ListMyPackagePurchasesParams) =>
    [...packagePurchaseQueryKeys.all, "list", params ?? {}] as const,
  detail: (purchaseId: string) => [...packagePurchaseQueryKeys.all, purchaseId] as const,
};

export function useMyPackagePurchases(params?: ListMyPackagePurchasesParams) {
  return useQuery({
    queryKey: packagePurchaseQueryKeys.list(params),
    queryFn: () => listMyPackagePurchasesWithParams(params),
    staleTime: 30_000,
  });
}

export function useMyPackagePurchase(purchaseId: string | null) {
  return useQuery({
    queryKey: packagePurchaseQueryKeys.detail(purchaseId ?? ""),
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
