import { resolvePaymentRegionalResolution } from '@common/payments/payment-region.resolver';

type AcademyPriceLike = {
  toString(): string;
};

export function isPositiveAcademyPriceAmount(value: string | null) {
  if (value === null) {
    return false;
  }

  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0;
}

export type AcademyCoursePricingState = {
  priceAmountEgp: string | null;
  priceAmountUsd: string | null;
  priceAmount: string | null;
  currencyCode: string | null;
};

export type AcademyCoursePricingPayload = Partial<AcademyCoursePricingState>;

export function normalizeAcademyPriceValue(value?: string | null) {
  const normalized = value?.trim() ?? '';
  return normalized.length > 0 ? normalized : null;
}

export function normalizeAcademyCurrencyCode(value?: string | null) {
  const normalized = value?.trim().toUpperCase() ?? '';
  return normalized.length > 0 ? normalized : null;
}

export function resolveAcademyCoursePricingState(
  current: AcademyCoursePricingState | null,
  payload: AcademyCoursePricingPayload,
): AcademyCoursePricingState {
  const next: AcademyCoursePricingState = {
    priceAmountEgp:
      payload.priceAmountEgp !== undefined
        ? normalizeAcademyPriceValue(payload.priceAmountEgp)
        : (current?.priceAmountEgp ?? null),
    priceAmountUsd:
      payload.priceAmountUsd !== undefined
        ? normalizeAcademyPriceValue(payload.priceAmountUsd)
        : (current?.priceAmountUsd ?? null),
    priceAmount:
      payload.priceAmount !== undefined
        ? normalizeAcademyPriceValue(payload.priceAmount)
        : (current?.priceAmount ?? null),
    currencyCode:
      payload.currencyCode !== undefined
        ? normalizeAcademyCurrencyCode(payload.currencyCode)
        : (current?.currencyCode ?? null),
  };

  const legacyAmount = next.priceAmount;
  const legacyCurrency = next.currencyCode;

  if (!next.priceAmountEgp && legacyCurrency === 'EGP' && legacyAmount) {
    next.priceAmountEgp = legacyAmount;
  }

  if (!next.priceAmountUsd && legacyCurrency === 'USD' && legacyAmount) {
    next.priceAmountUsd = legacyAmount;
  }

  if (next.priceAmountEgp) {
    next.priceAmount = next.priceAmountEgp;
    next.currencyCode = 'EGP';
    return next;
  }

  if (next.priceAmountUsd) {
    next.priceAmount = next.priceAmountUsd;
    next.currencyCode = 'USD';
    return next;
  }

  if (legacyAmount && legacyCurrency) {
    next.priceAmount = legacyAmount;
    next.currencyCode = legacyCurrency;
    return next;
  }

  next.priceAmount = null;
  next.currencyCode = null;
  return next;
}

export function resolveAcademyCheckoutPricing(input: {
  priceAmountEgp: AcademyPriceLike | null;
  priceAmountUsd: AcademyPriceLike | null;
  priceAmount: AcademyPriceLike | null;
  currencyCode: string | null;
  resolvedCountryCode: string | null;
}) {
  const regionalResolution = resolvePaymentRegionalResolution({
    requestCountryIsoCode: input.resolvedCountryCode,
  });
  const isEgypt = regionalResolution.regionalPricingMode === 'EGYPT_LOCAL';
  const regionalPricingMode = regionalResolution.regionalPricingMode;

  const egpAmount = input.priceAmountEgp?.toString() ?? null;
  const usdAmount = input.priceAmountUsd?.toString() ?? null;

  if (isEgypt) {
    if (isPositiveAcademyPriceAmount(egpAmount)) {
      return {
        amount: egpAmount,
        currencyCode: 'EGP' as const,
        regionalPricingMode,
        resolvedCountryCode: regionalResolution.resolvedCountryIsoCode,
      };
    }
  } else if (isPositiveAcademyPriceAmount(usdAmount)) {
    return {
      amount: usdAmount,
      currencyCode: 'USD' as const,
      regionalPricingMode,
      resolvedCountryCode: regionalResolution.resolvedCountryIsoCode,
    };
  }

  return {
    amount: null,
    currencyCode: null,
    regionalPricingMode,
    resolvedCountryCode: regionalResolution.resolvedCountryIsoCode,
  };
}

export function resolveAcademyDefaultPricing(input: {
  priceAmountEgp: AcademyPriceLike | null;
  priceAmountUsd: AcademyPriceLike | null;
  priceAmount: AcademyPriceLike | null;
  currencyCode: string | null;
}) {
  return resolveAcademyCheckoutPricing({
    ...input,
    resolvedCountryCode: 'EG',
  });
}
