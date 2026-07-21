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

  // Country-to-currency resolution is backend-only. These values are safe here
  // only when they were returned by a backend pricing contract.
  return null;
}
