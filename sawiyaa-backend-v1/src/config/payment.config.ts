import { registerAs } from '@nestjs/config';

function parseBooleanFlag(
  value: string | undefined,
  fallback: boolean,
): boolean {
  if (value === undefined) {
    return fallback;
  }

  return value.toLowerCase() === 'true';
}

function normalizeMode(
  value: string | undefined,
  fallback: 'test' | 'live' = 'test',
): 'test' | 'live' {
  const normalized = value?.trim().toLowerCase();
  return normalized === 'live' ? 'live' : fallback;
}

function normalizeBaseUrl(value: string | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;

  return trimmed.replace(/\/+$/, '');
}

function normalizeDecimal(value: string | undefined, fallback = '0'): string {
  const normalized = value?.trim();
  if (!normalized) {
    return fallback;
  }

  return normalized;
}

function normalizePaymobCheckoutMethod(
  value: string | undefined,
): string | null {
  const normalized = value?.trim();

  return normalized || null;
}

function normalizePaymobCheckoutFlow(
  value: string | undefined,
): 'legacy' | 'intention' {
  const normalized = value?.trim().toLowerCase();
  return normalized === 'intention' ? 'intention' : 'legacy';
}

export default registerAs('payment', () => ({
  appEnv: process.env.APP_ENV ?? process.env.NODE_ENV ?? 'development',
  isDevelopment:
    (process.env.APP_ENV ?? process.env.NODE_ENV ?? 'development') !==
    'production',
  appBaseUrl: normalizeBaseUrl(process.env.APP_BASE_URL),
  redirectUrls: {
    success: process.env.PAYMENT_SUCCESS_URL?.trim() || null,
    failed: process.env.PAYMENT_FAILED_URL?.trim() || null,
    pending: process.env.PAYMENT_PENDING_URL?.trim() || null,
  },
  accounting: {
    vatEnabled: parseBooleanFlag(process.env.FINANCE_VAT_ENABLED, false),
    vatRatePercent: normalizeDecimal(process.env.FINANCE_VAT_RATE_PERCENT, '0'),
    gatewayFeeRatePercent: normalizeDecimal(
      process.env.FINANCE_GATEWAY_FEE_RATE_PERCENT,
      '0',
    ),
    gatewayFeeFixedAmount: normalizeDecimal(
      process.env.FINANCE_GATEWAY_FEE_FIXED_AMOUNT,
      '0',
    ),
  },
  stripe: {
    enabled: parseBooleanFlag(process.env.PAYMENT_STRIPE_ENABLED, false),
    mode: normalizeMode(process.env.STRIPE_MODE, 'test'),
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
    secretKey: process.env.STRIPE_SECRET_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    apiBaseUrl: normalizeBaseUrl(process.env.STRIPE_API_BASE_URL),
  },
  paymob: {
    enabled: parseBooleanFlag(process.env.PAYMENT_PAYMOB_ENABLED, false),
    mode: normalizeMode(process.env.PAYMOB_MODE, 'test'),
    apiKey: process.env.PAYMOB_API_KEY,
    publicKey: process.env.PAYMOB_PUBLIC_KEY,
    hmacSecret: process.env.PAYMOB_HMAC_SECRET,
    baseUrl: normalizeBaseUrl(process.env.PAYMOB_BASE_URL),
    intentionBaseUrl: normalizeBaseUrl(
      process.env.PAYMOB_INTENTION_BASE_URL ?? 'https://flashapi.paymob.com',
    ),
    checkoutBaseUrl: normalizeBaseUrl(
      process.env.PAYMOB_CHECKOUT_BASE_URL ?? 'https://flashapi.paymob.com',
    ),
    checkoutFlow: normalizePaymobCheckoutFlow(process.env.PAYMOB_CHECKOUT_FLOW),
    methodRegistryJson: process.env.PAYMOB_METHOD_REGISTRY_JSON ?? null,
    egpCardIntegrationId:
      process.env.PAYMOB_EGP_CARD_INTEGRATION_ID ??
      process.env.PAYMOB_INTEGRATION_ID_CARD ??
      process.env.PAYMOB_INTEGRATION_ID,
    egpWalletIntegrationId: process.env.PAYMOB_EGP_WALLET_INTEGRATION_ID,
    usdCardIntegrationId: process.env.PAYMOB_USD_CARD_INTEGRATION_ID,
    integrationIdCard:
      process.env.PAYMOB_INTEGRATION_ID_CARD ??
      process.env.PAYMOB_INTEGRATION_ID,
    integrationIdWallet: process.env.PAYMOB_INTEGRATION_ID_WALLET,
    iframeId: process.env.PAYMOB_IFRAME_ID,
    defaultCheckoutMethod: normalizePaymobCheckoutMethod(
      process.env.PAYMOB_DEFAULT_CHECKOUT_METHOD,
    ),
  },
}));
