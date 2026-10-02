import { parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js/max";

/** Return a WhatsApp-safe international number without a leading plus sign. */
export function normalizeWhatsAppNumber(value: string | null | undefined, countryCode?: string | null): string | null {
  const input = value?.trim();
  if (!input) return null;

  const defaultCountry = countryCode?.trim().toUpperCase();
  const parsed = parsePhoneNumberFromString(
    input.startsWith("00") ? `+${input.slice(2)}` : input,
    defaultCountry && /^[A-Z]{2}$/.test(defaultCountry) ? (defaultCountry as CountryCode) : undefined,
  );

  if (!parsed || !parsed.isValid()) return null;
  return parsed.number.replace(/^\+/, "");
}
