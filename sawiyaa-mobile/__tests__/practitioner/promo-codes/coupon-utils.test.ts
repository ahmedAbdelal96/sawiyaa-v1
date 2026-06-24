import {
  buildCreatePractitionerCouponRequest,
  buildUpdatePractitionerCouponRequest,
  classifyPractitionerPromoCodeError,
  normalizePractitionerPromoCodeInput,
  sanitizePractitionerPromoCodeInput,
  validatePractitionerPromoCodeForm,
} from "../../../src/features/practitioner/promo-codes/coupon-utils";

describe("normalizePractitionerPromoCodeInput", () => {
  it("trims and uppercases promo codes", () => {
    expect(normalizePractitionerPromoCodeInput("  qa-10!  ")).toBe("QA-10!");
  });
});

describe("sanitizePractitionerPromoCodeInput", () => {
  it("removes unsafe characters", () => {
    expect(sanitizePractitionerPromoCodeInput("  qa-10!  ")).toBe("QA-10");
  });
});

describe("validatePractitionerPromoCodeForm", () => {
  it("rejects discount values above 20", () => {
    const errors = validatePractitionerPromoCodeForm({
      code: "QA25",
      discountValue: "25",
      usageLimitTotal: "",
      usageLimitPerPatient: "",
      startsAt: "",
      endsAt: "",
      isActive: true,
    });

    expect(errors.discountValue).toBe("tooHigh");
  });

  it("rejects invalid code characters", () => {
    const errors = validatePractitionerPromoCodeForm({
      code: "QA 10",
      discountValue: "10",
      usageLimitTotal: "",
      usageLimitPerPatient: "",
      startsAt: "",
      endsAt: "",
      isActive: true,
    });

    expect(errors.code).toBe("invalid");
  });
});

describe("buildCreatePractitionerCouponRequest", () => {
  it("builds a backend-safe payload without ownerPractitionerId or couponScope", () => {
    const payload = buildCreatePractitionerCouponRequest({
      code: "  qa10 ",
      discountValue: "10",
      usageLimitTotal: "50",
      usageLimitPerPatient: "2",
      startsAt: "2026-05-01",
      endsAt: "2026-12-31",
      isActive: true,
    });

    expect(payload).toEqual({
      code: "QA10",
      discountType: "PERCENTAGE",
      discountValue: "10",
      usageLimitTotal: 50,
      usageLimitPerPatient: 2,
      startsAt: "2026-05-01",
      endsAt: "2026-12-31",
      isActive: true,
    });
  });
});

describe("buildUpdatePractitionerCouponRequest", () => {
  it("keeps update payload limited to safe fields", () => {
    const payload = buildUpdatePractitionerCouponRequest({
      code: "QA10",
      discountValue: "12.5",
      usageLimitTotal: "",
      usageLimitPerPatient: "3",
      startsAt: "",
      endsAt: "",
      isActive: false,
    });

    expect(payload).toEqual({
      discountValue: "12.5",
      usageLimitPerPatient: 3,
      isActive: false,
    });
  });

  it("can skip discount changes when a coupon is already redeemed", () => {
    const payload = buildUpdatePractitionerCouponRequest(
      {
        code: "QA10",
        discountValue: "12.5",
        usageLimitTotal: "20",
        usageLimitPerPatient: "",
        startsAt: "",
        endsAt: "",
        isActive: true,
      },
      { skipDiscountValue: true },
    );

    expect(payload).toEqual({
      usageLimitTotal: 20,
      isActive: true,
    });
  });
});

describe("classifyPractitionerPromoCodeError", () => {
  it("classifies duplicate code errors", () => {
    expect(classifyPractitionerPromoCodeError("Coupon code already exists.")).toBe(
      "duplicateCode",
    );
  });

  it("falls back to generic for unknown messages", () => {
    expect(classifyPractitionerPromoCodeError("Something else happened")).toBe(
      "generic",
    );
  });
});
