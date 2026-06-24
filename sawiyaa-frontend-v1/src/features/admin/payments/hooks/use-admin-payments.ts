import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getAdminPaymentOpsDetails,
  getAdminPaymentRefunds,
  requestAdminPaymentRefund,
  retryAdminPaymentRefund,
} from "../api/admin-payments.api";
import { adminPaymentsQueryKeys } from "../constants/query-keys";
import type { RequestAdminRefundInput } from "../types/admin-payments.types";

export function useAdminPaymentOpsDetails(paymentId?: string) {
  return useQuery({
    queryKey: adminPaymentsQueryKeys.details(paymentId ?? ""),
    queryFn: () => getAdminPaymentOpsDetails(paymentId as string),
    enabled: Boolean(paymentId),
    staleTime: 30_000,
    gcTime: 10 * 60_000,
  });
}

export function useAdminPaymentRefunds(paymentId?: string) {
  return useQuery({
    queryKey: adminPaymentsQueryKeys.refunds(paymentId ?? ""),
    queryFn: () => getAdminPaymentRefunds(paymentId as string),
    enabled: Boolean(paymentId),
    staleTime: 30_000,
    gcTime: 10 * 60_000,
  });
}

export function useRequestAdminPaymentRefund() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      paymentId,
      data,
    }: {
      paymentId: string;
      data: RequestAdminRefundInput;
    }) => requestAdminPaymentRefund(paymentId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: adminPaymentsQueryKeys.details(variables.paymentId),
      });
      queryClient.invalidateQueries({
        queryKey: adminPaymentsQueryKeys.refunds(variables.paymentId),
      });
    },
  });
}

export function useRetryAdminPaymentRefund() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      paymentId,
      refundId,
    }: {
      paymentId: string;
      refundId: string;
    }) => retryAdminPaymentRefund(paymentId, refundId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: adminPaymentsQueryKeys.details(variables.paymentId),
      });
      queryClient.invalidateQueries({
        queryKey: adminPaymentsQueryKeys.refunds(variables.paymentId),
      });
    },
  });
}
