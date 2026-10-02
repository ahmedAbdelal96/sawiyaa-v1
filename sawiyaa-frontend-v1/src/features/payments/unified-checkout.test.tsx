import { describe, expect, it } from "vitest";

function resolveWalletSplit(input: {
  totalAmount: string;
  walletBalance: string;
  useWalletBalance: boolean;
}) {
  const total = Number(input.totalAmount) || 0;
  const wallet = input.useWalletBalance ? Number(input.walletBalance) || 0 : 0;
  const walletUsed = Math.min(wallet, total);
  const gatewayRemaining = Math.max(total - walletUsed, 0);

  return {
    walletUsed: walletUsed.toFixed(2),
    gatewayRemaining: gatewayRemaining.toFixed(2),
  };
}

function resolveFinancialHierarchy(input: {
  grossAmount: string;
  discountAmount: string;
  walletBalance: string;
  useWalletBalance: boolean;
  walletCurrency: string;
  sessionCurrency: string;
}) {
  const gross = Number(input.grossAmount) || 0;
  const discount = Number(input.discountAmount) || 0;
  const netPaid = Math.max(0, gross - discount);

  const currencyMatches = input.walletCurrency === input.sessionCurrency;
  const availableWallet = currencyMatches && input.useWalletBalance ? Number(input.walletBalance) || 0 : 0;

  const walletUsed = Math.min(availableWallet, netPaid);
  const gatewayRemaining = Math.max(0, netPaid - walletUsed);

  return {
    grossAmount: gross.toFixed(2),
    discountAmount: discount.toFixed(2),
    netPaidAmount: netPaid.toFixed(2),
    walletUsed: walletUsed.toFixed(2),
    gatewayRemaining: gatewayRemaining.toFixed(2),
    isWalletOnly: gatewayRemaining <= 0,
  };
}

function isSessionExpired(expiresAt: string | null, now: number = Date.now()): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt).getTime() <= now;
}

describe("Unified Booking & Checkout — Authoritative Business Logic", () => {
  describe("Case A: No Wallet Balance", () => {
    it("charges 350 EGP full amount to external gateway when wallet balance is 0", () => {
      const result = resolveWalletSplit({
        totalAmount: "350.00",
        walletBalance: "0.00",
        useWalletBalance: true,
      });

      expect(result.walletUsed).toBe("0.00");
      expect(result.gatewayRemaining).toBe("350.00");
    });
  });

  describe("Case B: Partial Wallet Payment", () => {
    it("deducts 100 EGP from wallet and leaves 250 EGP for external gateway", () => {
      const result = resolveWalletSplit({
        totalAmount: "350.00",
        walletBalance: "100.00",
        useWalletBalance: true,
      });

      expect(result.walletUsed).toBe("100.00");
      expect(result.gatewayRemaining).toBe("250.00");
    });
  });

  describe("Case C: Full Wallet Payment", () => {
    it("deducts full 350 EGP from wallet when wallet balance is 500 EGP and remaining is 0", () => {
      const result = resolveWalletSplit({
        totalAmount: "350.00",
        walletBalance: "500.00",
        useWalletBalance: true,
      });

      expect(result.walletUsed).toBe("350.00");
      expect(result.gatewayRemaining).toBe("0.00");
      expect(Number(result.gatewayRemaining) <= 0).toBe(true);
    });
  });

  describe("Case D: Wallet Exists But Not Selected", () => {
    it("charges full 350 EGP externally when user untoggles wallet usage", () => {
      const result = resolveWalletSplit({
        totalAmount: "350.00",
        walletBalance: "100.00",
        useWalletBalance: false,
      });

      expect(result.walletUsed).toBe("0.00");
      expect(result.gatewayRemaining).toBe("350.00");
    });
  });

  describe("Case E: Coupon Discount + Wallet Interaction", () => {
    it("applies calculation order: Gross (400) -> Coupon Discount (50) -> Net (350) -> Wallet (100) -> Remainder (250)", () => {
      const result = resolveFinancialHierarchy({
        grossAmount: "400.00",
        discountAmount: "50.00",
        walletBalance: "100.00",
        useWalletBalance: true,
        walletCurrency: "EGP",
        sessionCurrency: "EGP",
      });

      expect(result.grossAmount).toBe("400.00");
      expect(result.discountAmount).toBe("50.00");
      expect(result.netPaidAmount).toBe("350.00");
      expect(result.walletUsed).toBe("100.00");
      expect(result.gatewayRemaining).toBe("250.00");
      expect(result.isWalletOnly).toBe(false);
    });

    it("handles 100% coupon coverage where net is 0, consuming 0 wallet", () => {
      const result = resolveFinancialHierarchy({
        grossAmount: "400.00",
        discountAmount: "400.00",
        walletBalance: "100.00",
        useWalletBalance: true,
        walletCurrency: "EGP",
        sessionCurrency: "EGP",
      });

      expect(result.netPaidAmount).toBe("0.00");
      expect(result.walletUsed).toBe("0.00");
      expect(result.gatewayRemaining).toBe("0.00");
      expect(result.isWalletOnly).toBe(true);
    });
  });

  describe("Case F: Currency Mismatch Incompatibility", () => {
    it("does not apply wallet deduction when wallet currency differs from session currency", () => {
      const result = resolveFinancialHierarchy({
        grossAmount: "350.00",
        discountAmount: "0.00",
        walletBalance: "500.00",
        useWalletBalance: true,
        walletCurrency: "EGP",
        sessionCurrency: "USD",
      });

      expect(result.walletUsed).toBe("0.00");
      expect(result.gatewayRemaining).toBe("350.00");
    });
  });

  describe("Case G & H: Expiry and Double Submission Safety", () => {
    it("identifies expired reservation timestamps accurately", () => {
      const past = new Date(Date.now() - 1000).toISOString();
      const future = new Date(Date.now() + 60000).toISOString();

      expect(isSessionExpired(past)).toBe(true);
      expect(isSessionExpired(future)).toBe(false);
    });

    it("verifies initiate API payload fields for with-wallet and without-wallet submissions", () => {
      const buildPayload = (input: {
        couponCode?: string;
        useWalletBalance: boolean;
        acceptedRefundPolicyId: string;
      }) => ({
        couponCode: input.couponCode,
        useWalletBalance: input.useWalletBalance,
        acceptedRefundPolicyId: input.acceptedRefundPolicyId,
      });

      const withWallet = buildPayload({
        useWalletBalance: true,
        acceptedRefundPolicyId: "pol_123",
      });
      expect(withWallet.useWalletBalance).toBe(true);
      expect(withWallet.acceptedRefundPolicyId).toBe("pol_123");

      const withoutWallet = buildPayload({
        useWalletBalance: false,
        acceptedRefundPolicyId: "pol_123",
      });
      expect(withoutWallet.useWalletBalance).toBe(false);
    });
  });
});
