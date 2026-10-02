import type { UpdatePractitionerProfileRequest } from "@/features/practitioners/types/practitioners.types";

export type InstantBookingPriceField =
  | "instantBookingPrice30Egp"
  | "instantBookingPrice30Usd"
  | "instantBookingPrice60Egp"
  | "instantBookingPrice60Usd";

export const instantBookingPriceFields: InstantBookingPriceField[] = [
  "instantBookingPrice30Egp",
  "instantBookingPrice30Usd",
  "instantBookingPrice60Egp",
  "instantBookingPrice60Usd",
];

export type InstantBookingPriceForm = Record<InstantBookingPriceField, string>;

export function instantBookingPricingToForm(
  profile: Partial<Record<InstantBookingPriceField, number | null | undefined>>,
): InstantBookingPriceForm {
  return instantBookingPriceFields.reduce((form, field) => {
    const value = profile[field];
    form[field] = value === null || value === undefined ? "" : String(value);
    return form;
  }, {
    instantBookingPrice30Egp: "",
    instantBookingPrice30Usd: "",
    instantBookingPrice60Egp: "",
    instantBookingPrice60Usd: "",
  });
}

export function missingInstantBookingPriceFields(form: InstantBookingPriceForm) {
  return instantBookingPriceFields.filter((field) => {
    const value = Number(form[field]);
    return !form[field].trim() || !Number.isFinite(value) || value <= 0;
  });
}

export function instantBookingPricingToPayload(form: InstantBookingPriceForm): Pick<UpdatePractitionerProfileRequest, InstantBookingPriceField> {
  return instantBookingPriceFields.reduce<Pick<UpdatePractitionerProfileRequest, InstantBookingPriceField>>((payload, field) => {
    payload[field] = Number(form[field]);
    return payload;
  }, {} as Pick<UpdatePractitionerProfileRequest, InstantBookingPriceField>);
}

export function shouldOpenInstantPricingSetup(
  isEnabling: boolean,
  missingFields: number,
) {
  return isEnabling && missingFields > 0;
}
