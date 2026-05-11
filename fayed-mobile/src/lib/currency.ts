export type SupportedCurrencyCode = "EGP" | "USD";

export function resolveSupportedCurrencyCode(input: {
  currencyCode?: string | null;
  regionalPricingMode?: "EGYPT_LOCAL" | "INTERNATIONAL" | null;
  resolvedCountryIsoCode?: string | null;
  countryCode?: string | null;
}): SupportedCurrencyCode {
  if (input.regionalPricingMode === "EGYPT_LOCAL") {
    return "EGP";
  }

  if (input.regionalPricingMode === "INTERNATIONAL") {
    return "USD";
  }

  const explicitCurrency = input.currencyCode?.trim().toUpperCase();
  if (explicitCurrency === "EGP" || explicitCurrency === "USD") {
    return explicitCurrency;
  }

  const resolvedCountryIsoCode = input.resolvedCountryIsoCode?.trim().toUpperCase();
  if (resolvedCountryIsoCode === "EG" || resolvedCountryIsoCode === "EGY") {
    return "EGP";
  }

  const countryCode = input.countryCode?.trim().toUpperCase();
  if (countryCode === "EG") {
    return "EGP";
  }

  return "USD";
}
