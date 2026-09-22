import {
  missingNormalPriceFields,
  normalPricingToForm,
  normalPricingToPayload,
} from "../src/features/practitioner/profile/normal-pricing";

describe("normal practitioner pricing", () => {
  const profile = {
    pricing: {
      session30: { egp: 500, usd: 20 },
      session60: { egp: 900, usd: 35 },
    },
  } as any;

  it("maps API pricing into editable fields and payload without mixing instant prices", () => {
    const form = normalPricingToForm(profile);
    expect(form).toEqual({
      sessionPrice30Egp: "500",
      sessionPrice30Usd: "20",
      sessionPrice60Egp: "900",
      sessionPrice60Usd: "35",
    });
    expect(normalPricingToPayload(form)).toEqual({
      sessionPrice30Egp: 500,
      sessionPrice30Usd: 20,
      sessionPrice60Egp: 900,
      sessionPrice60Usd: 35,
    });
  });

  it("requires all four positive normal prices", () => {
    expect(missingNormalPriceFields({
      sessionPrice30Egp: "0",
      sessionPrice30Usd: "20",
      sessionPrice60Egp: "900",
      sessionPrice60Usd: "bad",
    })).toEqual(["sessionPrice30Egp", "sessionPrice60Usd"]);
  });
});
