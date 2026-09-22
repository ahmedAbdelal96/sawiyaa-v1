import { instantBookingPricingToForm, instantBookingPricingToPayload, missingInstantBookingPriceFields, shouldOpenInstantPricingSetup } from "../../src/features/practitioner/profile/instant-booking-pricing";
import type { PractitionerProfile } from "../../src/features/practitioner/profile/types";

const profile = {
  practitionerProfileId: "p1",
  instantBookingPrice30Egp: 300,
  instantBookingPrice30Usd: 10,
  instantBookingPrice60Egp: null,
  instantBookingPrice60Usd: 16,
} as PractitionerProfile;

describe("instant booking pricing settings contract", () => {
  it("opens pricing setup only when enabling with missing prices", () => {
    expect(shouldOpenInstantPricingSetup(true, 1)).toBe(true);
    expect(shouldOpenInstantPricingSetup(true, 0)).toBe(false);
    expect(shouldOpenInstantPricingSetup(false, 4)).toBe(false);
  });

  it("loads the four canonical independent values without normal session pricing", () => {
    expect(instantBookingPricingToForm(profile)).toEqual({
      instantBookingPrice30Egp: "300",
      instantBookingPrice30Usd: "10",
      instantBookingPrice60Egp: "",
      instantBookingPrice60Usd: "16",
    });
  });

  it("blocks incomplete setup and sends only independent instant prices", () => {
    const form = instantBookingPricingToForm(profile);
    expect(missingInstantBookingPriceFields(form)).toEqual(["instantBookingPrice60Egp"]);
    const complete = { ...form, instantBookingPrice60Egp: "500" };
    expect(missingInstantBookingPriceFields(complete)).toEqual([]);
    expect(instantBookingPricingToPayload(complete)).toEqual({
      instantBookingPrice30Egp: 300,
      instantBookingPrice30Usd: 10,
      instantBookingPrice60Egp: 500,
      instantBookingPrice60Usd: 16,
    });
    expect(Object.keys(instantBookingPricingToPayload(complete))).not.toContain("sessionPrice30Egp");
  });
});
