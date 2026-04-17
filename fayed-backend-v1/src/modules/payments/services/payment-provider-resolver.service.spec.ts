import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
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
  paymobIntegrationIdCard?: string;
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
      hmacSecret: config.paymobHmacSecret ?? 'paymob_hmac',
      baseUrl: config.paymobBaseUrl ?? 'https://accept.paymob.com/api',
      integrationIdCard: config.paymobIntegrationIdCard ?? 'paymob_integration',
      integrationIdWallet: null,
      iframeId: config.paymobIframeId ?? 'paymob_iframe',
    }),
  } as never);

  return new PaymentProviderResolverService(capabilitiesService);
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

  it('routes international USD payments to Stripe', () => {
    const service = buildResolver({});

    expect(
      service.resolveProvider({
        currencyCode: 'USD',
        commissionMarketType: MarketType.CROSS_BORDER,
        operatingCountryIsoCode: 'EGY',
        checkoutCountryIsoCode: 'USA',
      }),
    ).toBe(PaymentProvider.STRIPE);
  });

  it('fails on unsupported EGP international combination', () => {
    const service = buildResolver({});

    expect(() =>
      service.resolveProvider({
        currencyCode: 'EGP',
        commissionMarketType: MarketType.CROSS_BORDER,
        operatingCountryIsoCode: 'USA',
        checkoutCountryIsoCode: 'EGY',
      }),
    ).toThrow(BadRequestException);
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

  it('routes local non-Egypt USD flow to Stripe', () => {
    const service = buildResolver({});

    expect(
      service.resolveProvider({
        currencyCode: 'USD',
        commissionMarketType: MarketType.LOCAL,
        operatingCountryIsoCode: 'USA',
        checkoutCountryIsoCode: 'USA',
      }),
    ).toBe(PaymentProvider.STRIPE);
  });
});
