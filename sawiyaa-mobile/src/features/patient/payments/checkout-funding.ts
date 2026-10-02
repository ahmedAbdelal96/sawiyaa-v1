import type { SessionFinancialBreakdown } from "./types";

export function resolveCheckoutFunding(
  breakdown: SessionFinancialBreakdown | null | undefined,
  useWalletBalance: boolean,
) {
  if (!breakdown) return { walletUsed: 0, gatewayRemaining: 0 };
  const quote = breakdown.fundingPreview;
  if (!quote) {
    return {
      walletUsed: 0,
      gatewayRemaining: Number(breakdown.netPaidAmount),
    };
  }
  const useQuotedWallet = useWalletBalance || quote.locked;
  return {
    walletUsed: useQuotedWallet ? Number(quote.walletUsed) : 0,
    gatewayRemaining: Number(
      useQuotedWallet ? quote.gatewayAmount : quote.gatewayAmountWithoutWallet,
    ),
  };
}

export function isCanonicallyCapturedPayment(status: string) {
  return status === "CAPTURED";
}
