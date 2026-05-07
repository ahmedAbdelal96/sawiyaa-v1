import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getAdminPaymentGatewayControl,
  getAdminPaymentGatewayControlHistory,
  getAdminPaymentGatewayControlRouting,
  listAdminPaymentGatewayControl,
  rollbackAdminPaymentGatewayControl,
  requestAdminPaymentGatewayControlStepUp,
  updateAdminPaymentGatewayControl,
  validateAdminPaymentGatewayControl,
} from "../api/admin-payment-gateway-control.api";
import { adminPaymentGatewayControlQueryKeys } from "../constants/query-keys";
import type {
  PaymentGatewayControlProvider,
  PaymentGatewayControlScope,
  PaymentGatewayControlValidationResult,
  PaymentRoutingDraft,
  PaymentRoutingRuntimeSnapshot,
  PaymobGatewayControlRuntimeSnapshot,
  StripeGatewayControlRuntimeSnapshot,
} from "../types/admin-payment-gateway-control.types";

export function useAdminPaymentGatewayControlList() {
  return useQuery({
    queryKey: adminPaymentGatewayControlQueryKeys.list(),
    queryFn: () => listAdminPaymentGatewayControl(),
    staleTime: 30_000,
    gcTime: 10 * 60_000,
  });
}

export function useAdminPaymentGatewayControl(provider: PaymentGatewayControlProvider) {
  return useQuery({
    queryKey: adminPaymentGatewayControlQueryKeys.provider(provider),
    queryFn: () => getAdminPaymentGatewayControl(provider),
    staleTime: 20_000,
    gcTime: 10 * 60_000,
  });
}

export function useAdminPaymentGatewayControlRouting() {
  return useQuery({
    queryKey: adminPaymentGatewayControlQueryKeys.routing(),
    queryFn: () => getAdminPaymentGatewayControlRouting(),
    staleTime: 20_000,
    gcTime: 10 * 60_000,
  });
}

export function useAdminPaymentGatewayControlHistory(
  scope: PaymentGatewayControlScope,
  provider: PaymentGatewayControlProvider | null,
) {
  return useQuery({
    queryKey: adminPaymentGatewayControlQueryKeys.history(scope, provider),
    queryFn: () => getAdminPaymentGatewayControlHistory(scope, provider),
    staleTime: 20_000,
    gcTime: 10 * 60_000,
  });
}

export function useValidateAdminPaymentGatewayControl(
  scope: PaymentGatewayControlScope,
  provider: PaymentGatewayControlProvider | null,
) {
  return useMutation({
    mutationFn: (
      draft:
        | PaymobGatewayControlRuntimeSnapshot
        | StripeGatewayControlRuntimeSnapshot
        | PaymentRoutingDraft,
    ) => validateAdminPaymentGatewayControl(scope, provider, draft),
  });
}

export function useRequestAdminPaymentGatewayControlStepUp(
  scope: PaymentGatewayControlScope,
  provider: PaymentGatewayControlProvider | null,
) {
  return useMutation({
    mutationFn: () => requestAdminPaymentGatewayControlStepUp(scope, provider),
  });
}

export function useUpdateAdminPaymentGatewayControl(
  scope: PaymentGatewayControlScope,
  provider: PaymentGatewayControlProvider | null,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (
      payload:
        | ({ reason: string; stepUpChallengeId: string; stepUpCode: string } & PaymobGatewayControlRuntimeSnapshot)
        | ({ reason: string; stepUpChallengeId: string; stepUpCode: string } & StripeGatewayControlRuntimeSnapshot)
        | ({ reason: string; stepUpChallengeId: string; stepUpCode: string } & PaymentRoutingDraft),
    ) => updateAdminPaymentGatewayControl(scope, provider, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminPaymentGatewayControlQueryKeys.all });
    },
  });
}

export function useRollbackAdminPaymentGatewayControl(
  scope: PaymentGatewayControlScope,
  provider: PaymentGatewayControlProvider | null,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: {
      reason: string;
      revisionId: string;
      stepUpChallengeId: string;
      stepUpCode: string;
    }) => rollbackAdminPaymentGatewayControl(scope, provider, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminPaymentGatewayControlQueryKeys.all });
    },
  });
}
