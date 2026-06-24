import { PaymentProvider } from '@prisma/client';
import { PaymentProviderCapabilitiesService } from './payment-provider-capabilities.service';

function buildService(
  overrides?: Partial<{
    paymobEnabled: boolean;
    paymobApiKey: string | null;
    paymobPublicKey: string | null;
    paymobHmacSecret: string | null;
    paymobBaseUrl: string | null;
    paymobIntentionBaseUrl: string | null;
    paymobCheckoutBaseUrl: string | null;
    paymobCheckoutFlow: 'legacy' | 'intention';
    paymobEgpCardIntegrationId: string | null;
    paymobEgpWalletIntegrationId: string | null;
    paymobUsdCardIntegrationId: string | null;
    paymobIframeId: string | null;
    paymobDefaultCheckoutMethod: 'CARD' | 'WALLET' | null;
  }>,
) {
  return new PaymentProviderCapabilitiesService({
    getStripeConfig: () => ({
      enabled: false,
      mode: 'test',
      publishableKey: null,
      secretKey: null,
      webhookSecret: null,
      apiBaseUrl: null,
    }),
    getPaymobConfig: () => ({
      enabled: overrides?.paymobEnabled ?? true,
      mode: 'test' as const,
      apiKey: overrides?.paymobApiKey ?? 'paymob_api',
      publicKey:
        overrides?.paymobPublicKey === null
          ? null
          : (overrides?.paymobPublicKey ?? 'public_key'),
      hmacSecret: overrides?.paymobHmacSecret ?? 'paymob_hmac',
      baseUrl: overrides?.paymobBaseUrl ?? 'https://accept.paymob.com/api',
      intentionBaseUrl:
        overrides?.paymobIntentionBaseUrl ?? 'https://flashapi.paymob.com',
      checkoutBaseUrl:
        overrides?.paymobCheckoutBaseUrl ?? 'https://flashapi.paymob.com',
      checkoutFlow: overrides?.paymobCheckoutFlow ?? 'legacy',
      egpCardIntegrationId:
        overrides?.paymobEgpCardIntegrationId === null
          ? null
          : (overrides?.paymobEgpCardIntegrationId ?? 'egp_card_integration'),
      egpWalletIntegrationId:
        overrides?.paymobEgpWalletIntegrationId === null
          ? null
          : (overrides?.paymobEgpWalletIntegrationId ??
            'egp_wallet_integration'),
      usdCardIntegrationId:
        overrides?.paymobUsdCardIntegrationId === null
          ? null
          : (overrides?.paymobUsdCardIntegrationId ?? 'usd_card_integration'),
      integrationIdCard:
        overrides?.paymobEgpCardIntegrationId === null
          ? null
          : (overrides?.paymobEgpCardIntegrationId ?? 'egp_card_integration'),
      integrationIdWallet: null,
      iframeId: overrides?.paymobIframeId ?? 'iframe_id',
      defaultCheckoutMethod: overrides?.paymobDefaultCheckoutMethod ?? 'CARD',
    }),
    getPaymobCheckoutFlow: () => 'legacy' as const,
    getPaymobEnabledMethods: (context?: { currencyCode?: string | null }) => {
      const methods: Array<{
        key: 'CARD' | 'WALLET';
        label: string;
        type: string;
        enabled: boolean;
        integrationId: string;
        currencyCodes: string[];
      }> = [];

      const normalizedCurrency = context?.currencyCode?.trim().toUpperCase();
      if (normalizedCurrency === 'USD') {
        const usdCardIntegrationId =
          overrides?.paymobUsdCardIntegrationId === null
            ? null
            : (overrides?.paymobUsdCardIntegrationId ?? 'usd_card_integration');

        if (usdCardIntegrationId) {
          methods.push({
            key: 'CARD',
            label: 'Card',
            type: 'CARD',
            enabled: true,
            integrationId: usdCardIntegrationId,
            currencyCodes: ['USD'],
          });
        }

        return methods;
      }

      const egpCardIntegrationId =
        overrides?.paymobEgpCardIntegrationId === null
          ? null
          : (overrides?.paymobEgpCardIntegrationId ?? 'egp_card_integration');
      const egpWalletIntegrationId =
        overrides?.paymobEgpWalletIntegrationId === null
          ? null
          : (overrides?.paymobEgpWalletIntegrationId ??
            'egp_wallet_integration');

      if (egpCardIntegrationId) {
        methods.push({
          key: 'CARD',
          label: 'Card',
          type: 'CARD',
          enabled: true,
          integrationId: egpCardIntegrationId,
          currencyCodes: ['EGP'],
        });
      }

      if (egpWalletIntegrationId) {
        methods.push({
          key: 'WALLET',
          label: 'Wallet',
          type: 'WALLET',
          enabled: true,
          integrationId: egpWalletIntegrationId,
          currencyCodes: ['EGP'],
        });
      }

      return methods;
    },
    getPaymobDefaultCheckoutMethod: () =>
      overrides?.paymobDefaultCheckoutMethod === null
        ? null
        : (overrides?.paymobDefaultCheckoutMethod ?? 'CARD'),
  } as never);
}

describe('PaymentProviderCapabilitiesService', () => {
  it('reports configured paymob methods from real config truth', () => {
    const service = buildService({
      paymobEgpWalletIntegrationId: 'egp_wallet_integration',
    });

    const capability = service.getCapability(PaymentProvider.PAYMOB, {
      currencyCode: 'EGP',
    });

    expect(capability.available).toBe(true);
    expect(capability.supportedMethods).toEqual(['CARD', 'WALLET']);
    expect(capability.defaultMethod).toBe('CARD');
  });

  it('marks paymob unavailable when no checkout method ids are configured', () => {
    const service = buildService({
      paymobEgpCardIntegrationId: null,
      paymobEgpWalletIntegrationId: null,
      paymobUsdCardIntegrationId: null,
    });

    const capability = service.getCapability(PaymentProvider.PAYMOB, {
      currencyCode: 'EGP',
    });

    expect(capability.available).toBe(false);
    expect(capability.configured).toBe(false);
    expect(capability.missingConfig).toEqual(
      expect.arrayContaining(['PAYMOB_EGP_CARD_INTEGRATION_ID']),
    );
  });

  it('keeps legacy paymob available without a public key', () => {
    const service = buildService({
      paymobPublicKey: null,
      paymobCheckoutFlow: 'legacy',
    });

    const capability = service.getCapability(PaymentProvider.PAYMOB);

    expect(capability.available).toBe(true);
    expect(capability.missingConfig).not.toContain('PAYMOB_PUBLIC_KEY');
  });

  it('requires public key for intention flow', () => {
    const service = buildService({
      paymobPublicKey: null,
      paymobCheckoutFlow: 'intention',
    });

    const capability = service.getCapability(PaymentProvider.PAYMOB);

    expect(capability.available).toBe(false);
    expect(capability.missingConfig).toContain('PAYMOB_PUBLIC_KEY');
  });

  it('reports USD card only and never exposes wallet for USD', () => {
    const service = buildService({
      paymobEgpWalletIntegrationId: 'egp_wallet_integration',
    });

    const capability = service.getCapability(PaymentProvider.PAYMOB, {
      currencyCode: 'USD',
    });

    expect(capability.available).toBe(true);
    expect(capability.supportedMethods).toEqual(['CARD']);
  });

  it('fails closed for USD when USD card config is missing', () => {
    const service = buildService({
      paymobUsdCardIntegrationId: null,
    });

    const capability = service.getCapability(PaymentProvider.PAYMOB, {
      currencyCode: 'USD',
    });

    expect(capability.available).toBe(false);
    expect(capability.missingConfig).toContain(
      'PAYMOB_USD_CARD_INTEGRATION_ID',
    );
  });
});
