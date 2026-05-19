import {
  classifyCouponError,
  normalizePromoCodeInput,
} from "../../../src/features/patient/payments/coupon-utils";

describe("normalizePromoCodeInput", () => {
  it("trims and uppercases promo codes", () => {
    expect(normalizePromoCodeInput("  qa15  ")).toBe("QA15");
  });

  it("keeps safe separators while uppercasing", () => {
    expect(normalizePromoCodeInput("dr-aha_med20")).toBe("DR-AHA_MED20");
  });
});

describe("classifyCouponError", () => {
  it("classifies invalid coupon errors", () => {
    expect(classifyCouponError("This promo code is invalid.")).toBe("invalid");
  });

  it("classifies expired coupon errors", () => {
    expect(classifyCouponError("انتهت صلاحية كود الخصم.")).toBe("expired");
  });

  it("classifies usage limit errors", () => {
    expect(classifyCouponError("This promo code has reached its usage limit.")).toBe(
      "totalLimit",
    );
  });

  it("classifies already used errors", () => {
    expect(classifyCouponError("This promo code was already used for this session.")).toBe(
      "alreadyUsed",
    );
  });

  it("returns null for unknown messages", () => {
    expect(classifyCouponError("We could not connect right now.")).toBeNull();
  });
});
