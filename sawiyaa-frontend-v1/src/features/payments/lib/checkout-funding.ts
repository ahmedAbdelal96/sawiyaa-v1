import type { FinancialBreakdown } from "@/features/sessions/types/financial.types";

export function resolveCheckoutFunding(
  quote: FinancialBreakdown["fundingPreview"],
  useWalletBalance: boolean,
) {
  if (!quote) return null;
  const useQuotedWallet = useWalletBalance || quote.locked;
  return {
    walletUsed: useQuotedWallet ? quote.walletUsed : "0.00",
    gatewayRemaining: useQuotedWallet
      ? quote.gatewayAmount
      : quote.gatewayAmountWithoutWallet,
  };
}
