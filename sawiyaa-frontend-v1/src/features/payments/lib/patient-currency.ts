export type SupportedPatientCurrencyCode = "EGP" | "USD";

const LOCAL_CURRENCY_CODE: SupportedPatientCurrencyCode = "EGP";
const FOREIGN_CURRENCY_CODE: SupportedPatientCurrencyCode = "USD";

export function resolvePatientCurrencyCode(input: {
  currencyCode?: string | null;
  regionalPricingMode?: "EGYPT_LOCAL" | "INTERNATIONAL" | null;
  resolvedCountryIsoCode?: string | null;
  countryCode?: string | null;
}): SupportedPatientCurrencyCode | null {
  if (input.regionalPricingMode === "EGYPT_LOCAL") {
    return LOCAL_CURRENCY_CODE;
  }

  if (input.regionalPricingMode === "INTERNATIONAL") {
    return FOREIGN_CURRENCY_CODE;
  }

  const explicitCurrency = input.currencyCode?.trim().toUpperCase();
  if (explicitCurrency === LOCAL_CURRENCY_CODE || explicitCurrency === FOREIGN_CURRENCY_CODE) {
    return explicitCurrency;
  }

  const resolvedCountryIsoCode = input.resolvedCountryIsoCode?.trim().toUpperCase();
  if (resolvedCountryIsoCode === "EG" || resolvedCountryIsoCode === "EGY") {
    return LOCAL_CURRENCY_CODE;
  }

  const countryCode = input.countryCode?.trim().toUpperCase();
  if (!countryCode) {
    return null;
  }

  return countryCode === "EG" ? LOCAL_CURRENCY_CODE : FOREIGN_CURRENCY_CODE;
}
