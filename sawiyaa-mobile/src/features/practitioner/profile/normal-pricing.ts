import type { PractitionerProfile, UpdatePractitionerProfileRequest } from "./types";

export type NormalPriceField =
  | "sessionPrice30Egp"
  | "sessionPrice30Usd"
  | "sessionPrice60Egp"
  | "sessionPrice60Usd";

export type NormalPriceForm = Record<NormalPriceField, string>;

export const normalPriceFields: NormalPriceField[] = [
  "sessionPrice30Egp",
  "sessionPrice30Usd",
  "sessionPrice60Egp",
  "sessionPrice60Usd",
];

export function normalPricingToForm(profile: PractitionerProfile): NormalPriceForm {
  return normalPriceFields.reduce(
    (result, field) => {
      const value = profile.pricing[
        field === "sessionPrice30Egp" || field === "sessionPrice30Usd"
          ? "session30"
          : "session60"
      ][field.endsWith("Egp") ? "egp" : "usd"];
      result[field] = value === null || value === undefined ? "" : String(value);
      return result;
    },
    {
      sessionPrice30Egp: "",
      sessionPrice30Usd: "",
      sessionPrice60Egp: "",
      sessionPrice60Usd: "",
    } as NormalPriceForm,
  );
}

export function missingNormalPriceFields(form: NormalPriceForm): NormalPriceField[] {
  return normalPriceFields.filter((field) => {
    const value = Number(form[field]);
    return !form[field].trim() || !Number.isFinite(value) || value <= 0;
  });
}

export function normalPricingToPayload(
  form: NormalPriceForm,
): Pick<UpdatePractitionerProfileRequest, NormalPriceField> {
  return {
    sessionPrice30Egp: Number(form.sessionPrice30Egp),
    sessionPrice30Usd: Number(form.sessionPrice30Usd),
    sessionPrice60Egp: Number(form.sessionPrice60Egp),
    sessionPrice60Usd: Number(form.sessionPrice60Usd),
  };
}
