type AcademyPriceLike = {
  toString(): string;
};

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
  const resolvedCountryCode =
    input.resolvedCountryCode?.trim().toUpperCase() ?? null;
  const isEgypt =
    resolvedCountryCode === 'EG' ||
    resolvedCountryCode === 'EGY' ||
    resolvedCountryCode?.startsWith('EG') === true;
  const regionalPricingMode = isEgypt
    ? 'EGYPT_LOCAL'
    : resolvedCountryCode
      ? 'INTERNATIONAL'
      : null;

  const egpAmount = input.priceAmountEgp?.toString() ?? null;
  const usdAmount = input.priceAmountUsd?.toString() ?? null;
  const legacyAmount = input.priceAmount?.toString() ?? null;
  const legacyCurrencyCode = input.currencyCode?.trim().toUpperCase() ?? null;

  if (isEgypt) {
    if (egpAmount) {
      return {
        amount: egpAmount,
        currencyCode: 'EGP' as const,
        regionalPricingMode,
        resolvedCountryCode,
      };
    }

    if (legacyCurrencyCode === 'EGP' && legacyAmount) {
      return {
        amount: legacyAmount,
        currencyCode: 'EGP' as const,
        regionalPricingMode,
        resolvedCountryCode,
      };
    }

    if (usdAmount) {
      return {
        amount: usdAmount,
        currencyCode: 'USD' as const,
        regionalPricingMode,
        resolvedCountryCode,
      };
    }
  } else {
    if (usdAmount) {
      return {
        amount: usdAmount,
        currencyCode: 'USD' as const,
        regionalPricingMode,
        resolvedCountryCode,
      };
    }

    if (legacyCurrencyCode === 'USD' && legacyAmount) {
      return {
        amount: legacyAmount,
        currencyCode: 'USD' as const,
        regionalPricingMode,
        resolvedCountryCode,
      };
    }

    if (egpAmount) {
      return {
        amount: egpAmount,
        currencyCode: 'EGP' as const,
        regionalPricingMode,
        resolvedCountryCode,
      };
    }
  }

  if (legacyAmount && legacyCurrencyCode) {
    return {
      amount: legacyAmount,
      currencyCode: legacyCurrencyCode,
      regionalPricingMode,
      resolvedCountryCode,
    };
  }

  if (egpAmount) {
    return {
      amount: egpAmount,
      currencyCode: 'EGP' as const,
      regionalPricingMode,
      resolvedCountryCode,
    };
  }

  if (usdAmount) {
    return {
      amount: usdAmount,
      currencyCode: 'USD' as const,
      regionalPricingMode,
      resolvedCountryCode,
    };
  }

  return {
    amount: null,
    currencyCode: null,
    regionalPricingMode,
    resolvedCountryCode,
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
