import { PaymentConfigStartupValidationService } from './payment-config-startup-validation.service';

function buildRuntimeConfigMock(overrides?: {
  stripe?: Partial<{
    enabled: boolean;
    mode: 'test' | 'live';
    secretKey: string | null;
    webhookSecret: string | null;
    apiBaseUrl: string | null;
  }>;
  paymob?: Partial<{
    enabled: boolean;
    mode: 'test' | 'live';
    apiKey: string | null;
    hmacSecret: string | null;
    baseUrl: string | null;
    integrationIdCard: string | null;
    iframeId: string | null;
  }>;
  development?: boolean;
  redirectThrows?: boolean;
  paymobMethodIssues?: string[];
}) {
  const stripe = {
    enabled: true,
    mode: 'test' as const,
    secretKey: 'sk_test',
    webhookSecret: 'whsec_test',
    apiBaseUrl: 'https://api.stripe.com',
    ...(overrides?.stripe ?? {}),
  };

  const paymob = {
    enabled: false,
    mode: 'test' as const,
    apiKey: null,
    hmacSecret: null,
    baseUrl: null,
    integrationIdCard: null,
    iframeId: null,
    ...(overrides?.paymob ?? {}),
  };

  return {
    isDevelopmentEnvironment: () => overrides?.development ?? true,
    getStripeConfig: () => stripe,
    getPaymobConfig: () => paymob,
    getPaymobCurrencyMethodConfigIssues: () =>
      overrides?.paymobMethodIssues ?? [],
    assertCheckoutConfigured: jest.fn(),
    assertWebhookConfigured: jest.fn(),
    getRedirectUrls: jest.fn(() => {
      if (overrides?.redirectThrows) {
        throw new Error('missing redirects');
      }
      return {
        success: 'http://localhost:3000/payment/success',
        failed: 'http://localhost:3000/payment/failed',
        pending: 'http://localhost:3000/payment/pending',
      };
    }),
  };
}

describe('PaymentConfigStartupValidationService', () => {
  it('passes with valid test-mode configuration', () => {
    const service = new PaymentConfigStartupValidationService(
      buildRuntimeConfigMock() as never,
    );

    expect(() => service.onModuleInit()).not.toThrow();
  });

  it('fails when redirect URLs are missing while provider is enabled', () => {
    const service = new PaymentConfigStartupValidationService(
      buildRuntimeConfigMock({ redirectThrows: true }) as never,
    );

    expect(() => service.onModuleInit()).toThrow(/redirect URLs are missing/i);
  });

  it('fails when stripe is in live mode in development', () => {
    const service = new PaymentConfigStartupValidationService(
      buildRuntimeConfigMock({
        stripe: {
          mode: 'live',
        },
      }) as never,
    );

    expect(() => service.onModuleInit()).toThrow(/Stripe mode is live/i);
  });

  it('fails when paymob currency or method config is unsafe', () => {
    const service = new PaymentConfigStartupValidationService(
      buildRuntimeConfigMock({
        paymob: {
          enabled: true,
          apiKey: 'paymob_api',
          hmacSecret: 'paymob_hmac',
          baseUrl: 'https://accept.paymob.com/api',
          integrationIdCard: 'egp_card',
          iframeId: 'iframe_id',
        },
        paymobMethodIssues: ['USD WALLET is not supported.'],
      }) as never,
    );

    expect(() => service.onModuleInit()).toThrow(
      /USD WALLET is not supported/i,
    );
  });
});
