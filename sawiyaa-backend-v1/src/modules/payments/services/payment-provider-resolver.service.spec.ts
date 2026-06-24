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
      },
      updatedAt: new Date().toISOString(),
    }),
  };

  return new PaymentProviderResolverService(
    capabilitiesService as never,
    paymentRuntimeConfigService as never,
  );
}

describe('PaymentProviderResolverService', () => {
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

  it('routes international USD payments to Paymob', () => {
    const service = buildResolver({});

    expect(
      service.resolveProvider({
        currencyCode: 'USD',
        commissionMarketType: MarketType.CROSS_BORDER,
        operatingCountryIsoCode: 'EGY',
        checkoutCountryIsoCode: 'USA',
      }),
    ).toBe(PaymentProvider.PAYMOB);
  });

  it('routes international EGP payments to Paymob', () => {
    const service = buildResolver({});

    expect(
      service.resolveProvider({
        currencyCode: 'EGP',
        commissionMarketType: MarketType.CROSS_BORDER,
        operatingCountryIsoCode: 'USA',
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
        checkoutCountryIsoCode: 'USA',
      }),
    ).toThrow(BadRequestException);
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
        operatingCountryIsoCode: 'USA',
        checkoutCountryIsoCode: 'USA',
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
        checkoutCountryIsoCode: 'USA',
      }),
    ).toThrow(ServiceUnavailableException);
  });
});
