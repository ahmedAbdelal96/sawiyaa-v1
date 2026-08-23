import { describe, expect, it } from "vitest";
import {
  instantBookingPricingToPayload,
  missingInstantBookingPriceFields,
  shouldOpenInstantPricingSetup,
} from "./instant-booking-pricing";

const complete = {
  instantBookingPrice30Egp: "300",
  instantBookingPrice30Usd: "10",
  instantBookingPrice60Egp: "500",
  instantBookingPrice60Usd: "16",
};

describe("instant booking enablement flow", () => {
  it("opens pricing setup instead of enabling when prices are missing", () => {
    expect(shouldOpenInstantPricingSetup(true, 1)).toBe(true);
    expect(shouldOpenInstantPricingSetup(true, 0)).toBe(false);
    expect(shouldOpenInstantPricingSetup(false, 4)).toBe(false);
  });

  it("validates all four prices and produces the profile update payload", () => {
    expect(missingInstantBookingPriceFields(complete)).toEqual([]);
    expect(instantBookingPricingToPayload(complete)).toEqual({
      instantBookingPrice30Egp: 300,
      instantBookingPrice30Usd: 10,
      instantBookingPrice60Egp: 500,
      instantBookingPrice60Usd: 16,
    });
  });
});
