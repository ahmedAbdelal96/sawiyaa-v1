import {
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { MarketType, PaymentProvider } from '@prisma/client';
import { PaymentProviderCapabilitiesService } from './payment-provider-capabilities.service';
import { PaymentProviderResolverService } from './payment-provider-resolver.service';

function buildResolver(config: {
  stripeEnabled?: boolean;
  stripeMode?: 'test' | 'live';
  paymobEnabled?: boolean;
  paymobMode?: 'test' | 'live';
  stripeSecretKey?: string;
  stripeWebhookSecret?: string;
  stripePublishableKey?: string;
  stripeApiBaseUrl?: string;
  paymobApiKey?: string;
  paymobHmacSecret?: string;
  paymobBaseUrl?: string;
  paymobPublicKey?: string;
  paymobIntentionBaseUrl?: string;
  paymobCheckoutBaseUrl?: string;
  paymobCheckoutFlow?: 'legacy' | 'intention';
  paymobEgpCardIntegrationId?: string | null;
  paymobEgpWalletIntegrationId?: string | null;
  paymobUsdCardIntegrationId?: string | null;
  paymobIframeId?: string;
  currencyRoutes?: Array<{
    currencyCode: 'EGP' | 'USD';
    paymentMethod: string;
    provider: PaymentProvider;
    integrationKey: string;
    environment: 'development' | 'staging' | 'production';
    enabled: boolean;
    priority: number;
    source: 'DATABASE' | 'ENVIRONMENT';
  }>;
}) {
  const capabilitiesService = new PaymentProviderCapabilitiesService({
    getStripeConfig: () => ({
      enabled: config.stripeEnabled ?? true,
      mode: config.stripeMode ?? 'test',
      publishableKey: config.stripePublishableKey ?? 'pk_test',
      secretKey: config.stripeSecretKey ?? 'sk_test',
      webhookSecret: config.stripeWebhookSecret ?? 'whsec_test',
      apiBaseUrl: config.stripeApiBaseUrl ?? 'https://api.stripe.com',
    }),
    getPaymobConfig: () => ({
      enabled: config.paymobEnabled ?? true,
      mode: config.paymobMode ?? 'test',
      apiKey: config.paymobApiKey ?? 'paymob_api',
      publicKey: config.paymobPublicKey ?? 'paymob_public',
      hmacSecret: config.paymobHmacSecret ?? 'paymob_hmac',
      baseUrl: config.paymobBaseUrl ?? 'https://accept.paymob.com/api',
      intentionBaseUrl:
        config.paymobIntentionBaseUrl ?? 'https://flashapi.paymob.com',
      checkoutBaseUrl:
        config.paymobCheckoutBaseUrl ?? 'https://flashapi.paymob.com',
      checkoutFlow: config.paymobCheckoutFlow ?? 'legacy',
      egpCardIntegrationId:
        config.paymobEgpCardIntegrationId === undefined
          ? 'paymob_egp_card'
          : config.paymobEgpCardIntegrationId,
      egpWalletIntegrationId:
        config.paymobEgpWalletIntegrationId === undefined
          ? null
          : config.paymobEgpWalletIntegrationId,
      usdCardIntegrationId:
        config.paymobUsdCardIntegrationId === undefined
          ? 'paymob_usd_card'
          : config.paymobUsdCardIntegrationId,
      integrationIdCard: config.paymobEgpCardIntegrationId ?? 'paymob_egp_card',
      integrationIdWallet: null,
      iframeId: config.paymobIframeId ?? 'paymob_iframe',
      defaultCheckoutMethod: 'CARD',
    }),
    getPaymobCheckoutFlow: () => config.paymobCheckoutFlow ?? 'legacy',
    getPaymobEnabledMethods: (context?: { currencyCode?: string | null }) => {
      const normalizedCurrency = context?.currencyCode?.trim().toUpperCase();

      if (normalizedCurrency === 'USD') {
        return config.paymobUsdCardIntegrationId === null
          ? []
          : [
              {
                key: 'CARD',
                label: 'Card',
                type: 'CARD',
                enabled: true,
                priority: 100,
                integrationId:
                  config.paymobUsdCardIntegrationId ?? 'paymob_usd_card',
                currencyCodes: ['USD'],
                supportedCheckoutFlows: ['legacy', 'intention'] as const,
                countryIsoCodes: [],
              },
            ];
      }

      const methods = [];

      if (config.paymobEgpCardIntegrationId !== null) {
        methods.push({
          key: 'CARD',
          label: 'Card',
          type: 'CARD',
          enabled: true,
          priority: 100,
          integrationId: config.paymobEgpCardIntegrationId ?? 'paymob_egp_card',
          currencyCodes: ['EGP'],
          supportedCheckoutFlows: ['legacy', 'intention'] as const,
          countryIsoCodes: [],
        });
      }

      if (config.paymobEgpWalletIntegrationId) {
        methods.push({
          key: 'WALLET',
          label: 'Wallet',
          type: 'WALLET',
          enabled: true,
          priority: 90,
          integrationId: config.paymobEgpWalletIntegrationId,
          currencyCodes: ['EGP'],
          supportedCheckoutFlows: ['legacy', 'intention'] as const,
          countryIsoCodes: ['EG', 'EGY'],
        });
      }

      return methods;
    },
    getPaymobDefaultCheckoutMethod: () => 'CARD',
  } as never);

  const paymentRuntimeConfigService = {
    getPaymentRoutingConfig: () => ({
      defaultProvider: PaymentProvider.PAYMOB,
      priorityOrder: [PaymentProvider.PAYMOB, PaymentProvider.STRIPE],
      fallbackProvider: PaymentProvider.STRIPE,
      validation: {
        healthy: true,
        issues: [],
      },
      sources: {
        defaultProvider: 'config',
        priorityOrder: 'config',
        fallbackProvider: 'config',
        currencyRoutes: config.currencyRoutes ? 'config' : 'env',
      },
      currencyRoutes: config.currencyRoutes ?? [],
      updatedAt: new Date().toISOString(),
    }),
    getPaymentEnvironment: () => 'development',
  };

  return new PaymentProviderResolverService(
    capabilitiesService as never,
    paymentRuntimeConfigService as never,
  );
}

describe('PaymentProviderResolverService', () => {
  it('uses a centrally configured provider route for USD card payments', () => {
    const service = buildResolver({
      currencyRoutes: [
        {
          currencyCode: 'USD',
          paymentMethod: 'CARD',
          provider: PaymentProvider.STRIPE,
          integrationKey: 'stripe-usd-card',
          environment: 'development',
          enabled: true,
          priority: 100,
          source: 'DATABASE',
        },
      ],
    });

    expect(
      service.resolveRoute({
        currencyCode: 'USD',
        commissionMarketType: MarketType.CROSS_BORDER,
        operatingCountryIsoCode: 'US',
        checkoutCountryIsoCode: 'US',
      }),
    ).toMatchObject({
      provider: PaymentProvider.STRIPE,
      integrationKey: 'stripe-usd-card',
      source: 'DATABASE',
    });
  });

  it('rejects equal-priority active routes as deterministic ambiguity', () => {
    const service = buildResolver({
      currencyRoutes: [
        {
          currencyCode: 'USD', paymentMethod: 'CARD', provider: PaymentProvider.PAYMOB,
          integrationKey: 'paymob-usd-card-a', environment: 'development', enabled: true, priority: 100, source: 'ENVIRONMENT',
        },
        {
          currencyCode: 'USD', paymentMethod: 'CARD', provider: PaymentProvider.STRIPE,
          integrationKey: 'stripe-usd-card', environment: 'development', enabled: true, priority: 100, source: 'DATABASE',
        },
      ],
    });

    expect(() =>
      service.resolveRoute({
        currencyCode: 'USD',
        commissionMarketType: MarketType.CROSS_BORDER,
        operatingCountryIsoCode: 'US',
        checkoutCountryIsoCode: 'US',
      }),
    ).toThrow(BadRequestException);
  });

  it('routes egypt local EGP payments to Paymob', () => {
    const service = buildResolver({});

    expect(
      service.resolveProvider({
        currencyCode: 'EGP',
        commissionMarketType: MarketType.LOCAL,
        operatingCountryIsoCode: 'EGY',
        checkoutCountryIsoCode: 'EGY',
      }),
    ).toBe(PaymentProvider.PAYMOB);
  });

  it.each([
    ['EG', 'EGY'],
    ['EGY', 'EG'],
    [' eg ', 'EGY'],
  ])(
    'treats local country %s and %s as the same canonical country',
    (operatingCountryIsoCode, checkoutCountryIsoCode) => {
      const service = buildResolver({});

      expect(
        service.resolveProvider({
          currencyCode: 'EGP',
          commissionMarketType: MarketType.LOCAL,
          operatingCountryIsoCode,
          checkoutCountryIsoCode,
        }),
      ).toBe(PaymentProvider.PAYMOB);
    },
  );

  it('routes international USD payments to Paymob', () => {
    const service = buildResolver({});

    expect(
      service.resolveProvider({
        currencyCode: 'USD',
        commissionMarketType: MarketType.CROSS_BORDER,
        operatingCountryIsoCode: 'EGY',
        checkoutCountryIsoCode: 'US',
      }),
    ).toBe(PaymentProvider.PAYMOB);
  });

  it('routes international EGP payments to Paymob', () => {
    const service = buildResolver({});

    expect(
      service.resolveProvider({
        currencyCode: 'EGP',
        commissionMarketType: MarketType.CROSS_BORDER,
        operatingCountryIsoCode: 'US',
        checkoutCountryIsoCode: 'EGY',
      }),
    ).toBe(PaymentProvider.PAYMOB);
  });

  it('fails when routing context is ambiguous', () => {
    const service = buildResolver({});

    expect(() =>
      service.resolveProvider({
        currencyCode: 'USD',
        commissionMarketType: MarketType.ANY,
        operatingCountryIsoCode: null,
        checkoutCountryIsoCode: 'US',
      }),
    ).toThrow(BadRequestException);
  });

  it('does not normalize an invalid stored country to Egypt', () => {
    const service = buildResolver({});

    expect(() =>
      service.resolveProvider({
        currencyCode: 'EGP',
        commissionMarketType: MarketType.LOCAL,
        operatingCountryIsoCode: 'XX',
        checkoutCountryIsoCode: 'EG',
      }),
    ).toThrow(BadRequestException);
  });

  it('routes the canonical USD fallback without a checkout country', () => {
    const service = buildResolver({});

    expect(
      service.resolveProvider({
        currencyCode: 'USD',
        commissionMarketType: MarketType.CROSS_BORDER,
        operatingCountryIsoCode: 'EGY',
        checkoutCountryIsoCode: null,
      }),
    ).toBe(PaymentProvider.PAYMOB);
  });

  it('fails clearly when selected provider is disabled', () => {
    const service = buildResolver({
      paymobEnabled: false,
    });

    expect(() =>
      service.resolveProvider({
        currencyCode: 'EGP',
        commissionMarketType: MarketType.LOCAL,
        operatingCountryIsoCode: 'EGY',
        checkoutCountryIsoCode: 'EGY',
      }),
    ).toThrow(ServiceUnavailableException);
  });

  it('routes local non-Egypt USD flow to Paymob', () => {
    const service = buildResolver({});

    expect(
      service.resolveProvider({
        currencyCode: 'USD',
        commissionMarketType: MarketType.LOCAL,
        operatingCountryIsoCode: 'US',
        checkoutCountryIsoCode: 'US',
      }),
    ).toBe(PaymentProvider.PAYMOB);
  });

  it('fails closed for USD when USD card config is missing', () => {
    const service = buildResolver({
      paymobUsdCardIntegrationId: null,
    });

    expect(() =>
      service.resolveProvider({
        currencyCode: 'USD',
        commissionMarketType: MarketType.CROSS_BORDER,
        operatingCountryIsoCode: 'EGY',
        checkoutCountryIsoCode: 'US',
      }),
    ).toThrow(ServiceUnavailableException);
  });
});
