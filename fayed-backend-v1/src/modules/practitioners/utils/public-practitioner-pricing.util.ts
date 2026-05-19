import type { PaymentRegionalResolution } from '@common/payments/payment-region.resolver';

type MoneyValue = string | { toString(): string } | number | null | undefined;

function toNullableNumber(value: MoneyValue): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  const numeric = Number(value.toString());
  return Number.isFinite(numeric) ? numeric : null;
}

function resolveDisplayPrice(preferred: MoneyValue): number | null {
  return toNullableNumber(preferred);
}

export function resolvePublicPractitionerPricing(input: {
  regionalResolution: PaymentRegionalResolution;
  sessionPrice30Egp: MoneyValue;
  sessionPrice30Usd: MoneyValue;
  sessionPrice60Egp: MoneyValue;
  sessionPrice60Usd: MoneyValue;
}) {
  const currencyCode = input.regionalResolution.currencyCode;
  const regionalPricingMode = input.regionalResolution.regionalPricingMode;
  const resolvedCountryIsoCode =
    input.regionalResolution.resolvedCountryIsoCode;

  const useEgyptianPrices = currencyCode === 'EGP';

  return {
    currencyCode,
    regionalPricingMode,
    resolvedCountryIsoCode,
    displaySessionPrice30: useEgyptianPrices
      ? resolveDisplayPrice(input.sessionPrice30Egp)
      : resolveDisplayPrice(input.sessionPrice30Usd),
    displaySessionPrice60: useEgyptianPrices
      ? resolveDisplayPrice(input.sessionPrice60Egp)
      : resolveDisplayPrice(input.sessionPrice60Usd),
  };
}
