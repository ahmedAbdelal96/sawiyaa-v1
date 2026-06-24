export const adminPaymentGatewayControlQueryKeys = {
  all: ["admin-payment-gateway-control"] as const,
  list: () => [...adminPaymentGatewayControlQueryKeys.all, "list"] as const,
  routing: () => [...adminPaymentGatewayControlQueryKeys.all, "routing"] as const,
  provider: (provider: string) => [...adminPaymentGatewayControlQueryKeys.all, "provider", provider] as const,
  history: (scope: string, provider: string | null) => [...adminPaymentGatewayControlQueryKeys.all, "history", scope, provider ?? "routing"] as const,
} as const;
