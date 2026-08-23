import type { PractitionerProfile, UpdatePractitionerProfileRequest } from "./types";

export type InstantBookingPriceField = "instantBookingPrice30Egp" | "instantBookingPrice30Usd" | "instantBookingPrice60Egp" | "instantBookingPrice60Usd";
export type InstantBookingPriceForm = Record<InstantBookingPriceField, string>;
export const instantBookingPriceFields: InstantBookingPriceField[] = ["instantBookingPrice30Egp", "instantBookingPrice30Usd", "instantBookingPrice60Egp", "instantBookingPrice60Usd"];

export function instantBookingPricingToForm(profile: PractitionerProfile): InstantBookingPriceForm {
  return instantBookingPriceFields.reduce((result, field) => {
    const value = profile[field];
    result[field] = value === null || value === undefined ? "" : String(value);
    return result;
  }, {
    instantBookingPrice30Egp: "",
    instantBookingPrice30Usd: "",
    instantBookingPrice60Egp: "",
    instantBookingPrice60Usd: "",
  });
}

export function missingInstantBookingPriceFields(form: InstantBookingPriceForm): InstantBookingPriceField[] {
  return instantBookingPriceFields.filter((field) => {
    const value = Number(form[field]);
    return !form[field].trim() || !Number.isFinite(value) || value <= 0;
  });
}

export function instantBookingPricingToPayload(form: InstantBookingPriceForm): Pick<UpdatePractitionerProfileRequest, InstantBookingPriceField> {
  return {
    instantBookingPrice30Egp: Number(form.instantBookingPrice30Egp),
    instantBookingPrice30Usd: Number(form.instantBookingPrice30Usd),
    instantBookingPrice60Egp: Number(form.instantBookingPrice60Egp),
    instantBookingPrice60Usd: Number(form.instantBookingPrice60Usd),
  };
}

export function shouldOpenInstantPricingSetup(isEnabling: boolean, missingFields: number) {
  return isEnabling && missingFields > 0;
}
