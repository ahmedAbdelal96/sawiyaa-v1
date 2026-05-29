export type SupportedCurrencyCode = "EGP" | "USD";

/**
 * Determines the currency to display to a patient, prioritizing patient country
 * over practitioner preference. Egyptian patients always see EGP prices.
 */
export function getPatientPreferredCurrency(
  patientCountryCode: string | null | undefined,
  practitioner: {
    currencyCode?: string | null;
    regionalPricingMode?: "EGYPT_LOCAL" | "INTERNATIONAL" | null;
    resolvedCountryIsoCode?: string | null;
    countryCode?: string | null;
  },
): SupportedCurrencyCode {
  const patientCountry = patientCountryCode?.trim().toUpperCase();

  // Egyptian patients always see EGP
  if (patientCountry === "EG" || patientCountry === "EGY") {
    return "EGP";
  }

  // For non-Egyptian patients, fall back to the practitioner's currency settings
  return resolveSupportedCurrencyCode({
    currencyCode: practitioner.currencyCode,
    regionalPricingMode: practitioner.regionalPricingMode,
    resolvedCountryIsoCode: practitioner.resolvedCountryIsoCode,
    countryCode: practitioner.countryCode,
  });
}

/**
 * Selects the appropriate price from the practitioner's price fields based on
 * the patient's preferred currency. Returns the price value (as number) or null.
 */
export function getPriceForPatientCurrency(
  patientCurrency: SupportedCurrencyCode,
  practitioner: {
    sessionPrice30Egp?: number | null;
    sessionPrice30Usd?: number | null;
    sessionPrice60Egp?: number | null;
    sessionPrice60Usd?: number | null;
    displaySessionPrice30?: number | null;
    displaySessionPrice60?: number | null;
  },
  duration: 30 | 60,
): number | null {
  if (patientCurrency === "EGP") {
    const price = duration === 30 ? practitioner.sessionPrice30Egp : practitioner.sessionPrice60Egp;
    return price ?? null;
  } else {
    const price = duration === 30 ? practitioner.sessionPrice30Usd : practitioner.sessionPrice60Usd;
    return price ?? null;
  }
}

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
