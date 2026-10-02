import {
  isCanonicallyCapturedPayment,
  resolveCheckoutFunding,
} from "../../../src/features/patient/payments/checkout-funding";

const breakdown = {
  sessionId: "session-1",
  currency: "EGP",
  regionalPricingMode: "EGYPT_LOCAL" as const,
  paymentProvider: "PAYMOB" as const,
  resolvedCountryIsoCode: "EG",
  grossAmount: "600.00",
  discountAmount: "100.00",
  netPaidAmount: "500.00",
  coupon: null,
  fundingPreview: {
    walletUsed: "200.00",
    gatewayAmount: "300.00",
    gatewayAmountWithoutWallet: "500.00",
    walletAvailable: "200.00",
    locked: false,
  },
};

describe("authoritative checkout funding", () => {
  it("uses the backend mixed-funding quote instead of recomputing it", () => {
    expect(resolveCheckoutFunding(breakdown, true)).toEqual({
      walletUsed: 200,
      gatewayRemaining: 300,
    });
  });

  it("keeps an existing payment attempt locked to its persisted split", () => {
    expect(
      resolveCheckoutFunding(
        { ...breakdown, fundingPreview: { ...breakdown.fundingPreview, locked: true } },
        false,
      ),
    ).toEqual({ walletUsed: 200, gatewayRemaining: 300 });
  });

  it("accepts only CAPTURED as canonical collection success", () => {
    expect(isCanonicallyCapturedPayment("CAPTURED")).toBe(true);
    expect(isCanonicallyCapturedPayment("AUTHORIZED")).toBe(false);
    expect(isCanonicallyCapturedPayment("PENDING")).toBe(false);
    expect(isCanonicallyCapturedPayment("REQUIRES_ACTION")).toBe(false);
  });
});
