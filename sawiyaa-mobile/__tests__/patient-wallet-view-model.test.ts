import {
  activityStatusKey,
  activityTitleKey,
  buildFinancialActivity,
  mapPaymentToActivity,
  mapWalletEntryToActivity,
  sortWalletActivity,
} from "../src/features/patient/payments/wallet-view-model";
import type { CustomerWalletEntryItem, PaymentItem } from "../src/features/patient/payments/types";

const walletEntry: CustomerWalletEntryItem = {
  id: "entry-1",
  entryType: "REFUND_CREDIT",
  direction: "CREDIT",
  amount: "500.00",
  currencyCode: "EGP",
  description: "internal provider note",
  paymentId: null,
  refundId: "refund-1",
  sessionId: null,
  referenceType: null,
  referenceId: null,
  effectiveAt: "2026-08-16T10:00:00.000Z",
  createdAt: "2026-08-16T10:00:00.000Z",
};

const payment: PaymentItem = {
  id: "payment-1",
  sessionId: "session-1",
  provider: "PAYMOB",
  status: "CAPTURED",
  amount: "350.00",
  amountSubtotal: "350.00",
  amountDiscount: "0.00",
  amountTotal: "350.00",
  amountFromWallet: "0.00",
  amountFromGateway: "350.00",
  currency: "EGP",
  regionalPricingMode: "EGYPT_LOCAL",
  resolvedCountryIsoCode: "EG",
  providerPaymentId: "provider-id",
  providerReference: "provider-reference",
  providerMethod: "CARD",
  checkoutUrl: null,
  clientSecret: null,
  paidAt: "2026-08-15T10:00:00.000Z",
  failedAt: null,
  expiredAt: null,
  refundedAt: null,
  createdAt: "2026-08-15T09:59:00.000Z",
  paymentAction: { canPay: false, reason: "COMPLETED" },
};

describe("patient wallet presentation model", () => {
  it("uses backend wallet amount/currency fields without deriving a balance", () => {
    const item = mapWalletEntryToActivity(walletEntry);

    expect(item.amount).toBe("500.00");
    expect(item.currencyCode).toBe("EGP");
    expect(item.direction).toBe("CREDIT");
    expect(activityTitleKey(item)).toBe("patientPaymentsFlow.activity.types.refund");
  });

  it("maps payment records to human presentation without exposing provider fields", () => {
    const item = mapPaymentToActivity(payment);

    expect(activityTitleKey(item)).toBe("patientPaymentsFlow.activity.types.payment");
    expect(activityStatusKey(item)).toBe("patientPaymentsFlow.activity.status.completed");
    expect(JSON.stringify(item)).not.toContain("PAYMOB");
    expect(JSON.stringify(item)).not.toContain("provider-reference");
  });

  it("keeps currencies and records separate while sorting by backend timestamps", () => {
    const usdCredit = mapWalletEntryToActivity({
      ...walletEntry,
      id: "entry-2",
      currencyCode: "USD",
      amount: "20.00",
      effectiveAt: "2026-08-17T10:00:00.000Z",
    });
    const result = sortWalletActivity([mapPaymentToActivity(payment), usdCredit]);

    expect(result.map((entry) => entry.currencyCode)).toEqual(["USD", "EGP"]);
    expect(result.map((entry) => entry.amount)).toEqual(["20.00", "350.00"]);
  });

  it("suppresses only wallet rows explicitly linked to a payment record", () => {
    const linkedEntry = { ...walletEntry, entryType: "SESSION_PAYMENT_CAPTURE" as const, paymentId: "payment-1" };
    const result = buildFinancialActivity([linkedEntry], [payment]);

    expect(result).toHaveLength(1);
    expect(result[0].source).toBe("payment");
  });
});
