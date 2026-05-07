const LOCAL_CURRENCY_CODE = "EGP";
const FOREIGN_CURRENCY_CODE = "USD";

export function resolvePatientCurrencyCode(input: {
  currencyCode?: string | null;
  countryCode?: string | null;
}): string | null {
  const explicitCurrency = input.currencyCode?.trim().toUpperCase();
  if (explicitCurrency) {
    return explicitCurrency;
  }

  const countryCode = input.countryCode?.trim().toUpperCase();
  if (!countryCode) {
    return null;
  }

  return countryCode === "EG" ? LOCAL_CURRENCY_CODE : FOREIGN_CURRENCY_CODE;
}
