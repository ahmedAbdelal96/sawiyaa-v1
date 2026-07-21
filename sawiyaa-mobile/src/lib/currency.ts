export type SupportedCurrencyCode = "EGP" | "USD";

export function resolveSupportedCurrencyCode(input: {
  currencyCode?: string | null;
  /** Legacy response metadata, intentionally ignored for pricing selection. */
  regionalPricingMode?: "EGYPT_LOCAL" | "INTERNATIONAL" | null;
  resolvedCountryIsoCode?: string | null;
  countryCode?: string | null;
}): SupportedCurrencyCode {
  const explicitCurrency = input.currencyCode?.trim().toUpperCase();
  if (explicitCurrency === "EGP" || explicitCurrency === "USD") {
    return explicitCurrency;
  }

  throw new Error("PRICING_REGION_UNAVAILABLE");
}
