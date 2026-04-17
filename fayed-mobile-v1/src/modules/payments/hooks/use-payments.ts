import { useMutation, useQuery } from "@tanstack/react-query";

import { paymentsService } from "@/modules/payments/application/payments.service";
import { queryClient } from "@/networking/query/query-client";

export function useInitiateSessionPayment(sessionId: string) {
  return useMutation({
    mutationFn: (couponCode?: string) =>
      paymentsService.initiateSessionPayment(sessionId, couponCode),
    onSuccess: async (payment) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["payments", "patient"] }),
        queryClient.invalidateQueries({ queryKey: ["sessions", "patient"] }),
        queryClient.invalidateQueries({ queryKey: ["session", payment.sessionId] }),
        queryClient.invalidateQueries({ queryKey: ["journey", "summary"] }),
      ]);
    },
  });
}

export function usePaymentsList(status?: string) {
  return useQuery({
    queryKey: ["payments", "patient", status || "all"],
    queryFn: () => paymentsService.listPayments(status),
  });
}

export function usePaymentDetails(paymentId: string) {
  return useQuery({
    enabled: Boolean(paymentId),
    queryKey: ["payment", paymentId],
    queryFn: () => paymentsService.getPayment(paymentId),
  });
}

export function useValidateSessionCoupon(sessionId: string) {
  return useMutation({
    mutationFn: (couponCode: string) => paymentsService.validateCoupon(sessionId, couponCode),
  });
}

export function useSessionFinancialBreakdown(sessionId: string, couponCode?: string) {
  return useQuery({
    enabled: Boolean(sessionId),
    queryKey: ["session-financial-breakdown", sessionId, couponCode || ""],
    queryFn: () => paymentsService.getFinancialBreakdown(sessionId, couponCode),
  });
}
