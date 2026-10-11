import {
  canContinuePackagePurchasePayment,
  getPackagePurchaseStatusConfig,
} from "./package-purchase-display";
import { describe, expect, it } from "vitest";

describe("package purchase status presentation", () => {
  it("presents REFUND_PENDING as a distinct warning state", () => {
    expect(getPackagePurchaseStatusConfig("REFUND_PENDING")).toEqual({
      labelKey: "list.status.REFUND_PENDING",
      tone: "warning",
    });
  });

  it("does not allow payment continuation while a refund is processing", () => {
    expect(
      canContinuePackagePurchasePayment({
        status: "REFUND_PENDING",
        paymentExpiresAt: "2099-01-01T00:00:00.000Z",
      }),
    ).toBe(false);
  });

  it("does not present unknown future statuses as active", () => {
    expect(getPackagePurchaseStatusConfig("FUTURE_STATUS")).toEqual({
      labelKey: "list.status.UNKNOWN",
      tone: "light",
    });
  });
});
