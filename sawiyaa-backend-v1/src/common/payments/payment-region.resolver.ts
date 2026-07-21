import { PaymentProvider } from '@prisma/client';
import { normalizeCountryIsoCode } from '@modules/auth/utils/request-country-context.util';

export type PaymentRegionalPricingMode = 'EGYPT_LOCAL' | 'INTERNATIONAL';
export type PaymentRegionalResolutionStatus = 'RESOLVED';
export type PaymentRegionalResolutionSource =
  | 'TRUSTED_COUNTRY'
  | 'DEFAULT_USD';

export interface PaymentRegionalResolutionInput {
  requestCountryIsoCode?: string | null;
  /** @deprecated Stored/account country is not a pricing signal. */
  patientCountryIsoCode?: string | null;
  /** @deprecated Stored/account country is not a pricing signal. */
  accountCountryIsoCode?: string | null;
  /** @deprecated Checkout country is not a trusted request signal. */
  checkoutCountryIsoCode?: string | null;
  operatingCountryIsoCode?: string | null;
  currencyCode?: string | null;
}

export type ResolvedPaymentRegionalResolution = {
  status: 'RESOLVED';
  resolvedCountryIsoCode: string | null;
  regionalPricingMode: PaymentRegionalPricingMode;
  currencyCode: 'EGP' | 'USD';
  provider: PaymentProvider;
  resolutionSource: PaymentRegionalResolutionSource;
  fallbackReasonCode: 'COUNTRY_UNAVAILABLE' | null;
};

export type PaymentRegionalResolution = ResolvedPaymentRegionalResolution;

const EGYPT_ISO_CODES = new Set(['EG', 'EGY']);
const SUPPORTED_CURRENCY_CODES = new Set(['EGP', 'USD']);

export function resolvePaymentRegionalResolution(
  input: PaymentRegionalResolutionInput,
): PaymentRegionalResolution {
  const resolvedCountryIsoCode = normalizeCountryIsoCode(
    input.requestCountryIsoCode,
  );
  const regionalPricingMode = isEgyptCountryCode(resolvedCountryIsoCode)
    ? 'EGYPT_LOCAL'
    : 'INTERNATIONAL';
  const currencyCode =
    regionalPricingMode === 'EGYPT_LOCAL' ? 'EGP' : 'USD';
  const provider = PaymentProvider.PAYMOB;

  return {
    status: 'RESOLVED',
    resolvedCountryIsoCode,
    regionalPricingMode,
    currencyCode,
    provider,
    resolutionSource: resolvedCountryIsoCode
      ? 'TRUSTED_COUNTRY'
      : 'DEFAULT_USD',
    fallbackReasonCode: resolvedCountryIsoCode ? null : 'COUNTRY_UNAVAILABLE',
  };
}

export function resolveProviderForCurrency(currencyCode: string) {
  const normalizedCurrencyCode = normalizeCurrencyCode(currencyCode);

  if (normalizedCurrencyCode === 'EGP') {
    return PaymentProvider.PAYMOB;
  }

  if (normalizedCurrencyCode === 'USD') {
    return PaymentProvider.PAYMOB;
  }

  return null;
}

export function isEgyptCountryCode(countryCode?: string | null) {
  const normalized = normalizeCountryIsoCode(countryCode);
  return Boolean(normalized && EGYPT_ISO_CODES.has(normalized));
}

function normalizeCurrencyCode(currencyCode?: string | null) {
  const normalized = currencyCode?.trim().toUpperCase() ?? null;
  return normalized && SUPPORTED_CURRENCY_CODES.has(normalized)
    ? normalized
    : null;
}
