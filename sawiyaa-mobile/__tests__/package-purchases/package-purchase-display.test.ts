import {
  canContinuePackagePurchasePayment,
  getPackagePurchaseStatusTone,
  getPackagePurchaseStatusTranslationKey,
} from "../../src/features/patient/package-plans/lib/package-purchase-display";

describe("mobile package purchase status presentation", () => {
  it("presents REFUND_PENDING as a warning with explicit copy", () => {
    expect(getPackagePurchaseStatusTone("REFUND_PENDING")).toBe("warning");
    expect(getPackagePurchaseStatusTranslationKey("REFUND_PENDING")).toBe(
      "packagePurchases.statuses.REFUND_PENDING",
    );
  });

  it("does not allow payment continuation while a refund is processing", () => {
    expect(
      canContinuePackagePurchasePayment({
        status: "REFUND_PENDING",
        paymentExpiresAt: "2099-01-01T00:00:00.000Z",
      } as never),
    ).toBe(false);
  });
});
