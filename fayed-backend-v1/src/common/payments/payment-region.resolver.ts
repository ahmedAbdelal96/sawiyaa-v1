import { PaymentProvider } from '@prisma/client';

export type PaymentRegionalPricingMode = 'EGYPT_LOCAL' | 'INTERNATIONAL';

export interface PaymentRegionalResolutionInput {
  patientCountryIsoCode?: string | null;
  accountCountryIsoCode?: string | null;
  checkoutCountryIsoCode?: string | null;
  operatingCountryIsoCode?: string | null;
  currencyCode?: string | null;
}

export interface PaymentRegionalResolution {
  resolvedCountryIsoCode: string | null;
  regionalPricingMode: PaymentRegionalPricingMode;
  currencyCode: string;
  provider: PaymentProvider;
}

const EGYPT_ISO_CODES = new Set(['EG', 'EGY']);
const SUPPORTED_CURRENCY_CODES = new Set(['EGP', 'USD']);

export function resolvePaymentRegionalResolution(
  input: PaymentRegionalResolutionInput,
): PaymentRegionalResolution {
  const resolvedCountryIsoCode = normalizeCountryIsoCode(
    input.patientCountryIsoCode ??
      input.accountCountryIsoCode ??
      input.checkoutCountryIsoCode ??
      input.operatingCountryIsoCode ??
      null,
  );
  const regionalPricingMode = isEgyptCountryCode(resolvedCountryIsoCode)
    ? 'EGYPT_LOCAL'
    : 'INTERNATIONAL';
  const explicitCurrency = normalizeCurrencyCode(input.currencyCode);
  const currencyCode =
    explicitCurrency ?? (regionalPricingMode === 'EGYPT_LOCAL' ? 'EGP' : 'USD');
  const provider =
    currencyCode === 'EGP' ? PaymentProvider.PAYMOB : PaymentProvider.STRIPE;

  return {
    resolvedCountryIsoCode,
    regionalPricingMode,
    currencyCode,
    provider,
  };
}

export function resolveProviderForCurrency(currencyCode: string) {
  const normalizedCurrencyCode = normalizeCurrencyCode(currencyCode);

  if (normalizedCurrencyCode === 'EGP') {
    return PaymentProvider.PAYMOB;
  }

  if (normalizedCurrencyCode === 'USD') {
    return PaymentProvider.STRIPE;
  }

  return null;
}

export function isEgyptCountryCode(countryCode?: string | null) {
  const normalized = normalizeCountryIsoCode(countryCode);
  return Boolean(normalized && EGYPT_ISO_CODES.has(normalized));
}

function normalizeCountryIsoCode(countryCode?: string | null) {
  const normalized = countryCode?.trim().toUpperCase() ?? null;
  return normalized && normalized.length > 0 ? normalized : null;
}

function normalizeCurrencyCode(currencyCode?: string | null) {
  const normalized = currencyCode?.trim().toUpperCase() ?? null;
  return normalized && SUPPORTED_CURRENCY_CODES.has(normalized)
    ? normalized
    : null;
}
