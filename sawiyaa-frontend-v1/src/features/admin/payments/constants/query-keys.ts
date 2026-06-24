export const adminPaymentsQueryKeys = {
  all: ["admin-payments"] as const,
  details: (paymentId: string) => [...adminPaymentsQueryKeys.all, "details", paymentId] as const,
  refunds: (paymentId: string) => [...adminPaymentsQueryKeys.all, "refunds", paymentId] as const,
};
