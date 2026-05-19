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
    paymobIntegrationIdCard: string | null;
    paymobIntegrationIdWallet: string | null;
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
      integrationIdCard:
        overrides?.paymobIntegrationIdCard === null
          ? null
          : (overrides?.paymobIntegrationIdCard ?? 'card_integration'),
      integrationIdWallet:
        overrides?.paymobIntegrationIdWallet === null
          ? null
          : (overrides?.paymobIntegrationIdWallet ?? 'wallet_integration'),
      iframeId: overrides?.paymobIframeId ?? 'iframe_id',
      defaultCheckoutMethod: overrides?.paymobDefaultCheckoutMethod ?? 'CARD',
    }),
    getPaymobCheckoutFlow: () => 'legacy' as const,
    getPaymobEnabledMethods: () => {
      const methods: Array<{
        key: 'CARD' | 'WALLET';
        label: string;
        type: string;
        enabled: boolean;
        integrationId: string;
      }> = [];

      const cardIntegrationId =
        overrides?.paymobIntegrationIdCard === null
          ? null
          : (overrides?.paymobIntegrationIdCard ?? 'card_integration');
      const walletIntegrationId =
        overrides?.paymobIntegrationIdWallet === null
          ? null
          : (overrides?.paymobIntegrationIdWallet ?? 'wallet_integration');

      if (cardIntegrationId) {
        methods.push({
          key: 'CARD',
          label: 'Card',
          type: 'CARD',
          enabled: true,
          integrationId: cardIntegrationId,
        });
      }

      if (walletIntegrationId) {
        methods.push({
          key: 'WALLET',
          label: 'Wallet',
          type: 'WALLET',
          enabled: true,
          integrationId: walletIntegrationId,
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
    const service = buildService();

    const capability = service.getCapability(PaymentProvider.PAYMOB);

    expect(capability.available).toBe(true);
    expect(capability.supportedMethods).toEqual(['CARD', 'WALLET']);
    expect(capability.defaultMethod).toBe('CARD');
  });

  it('marks paymob unavailable when no checkout method ids are configured', () => {
    const service = buildService({
      paymobIntegrationIdCard: null,
      paymobIntegrationIdWallet: null,
    });

    const capability = service.getCapability(PaymentProvider.PAYMOB);

    expect(capability.available).toBe(false);
    expect(capability.configured).toBe(false);
    expect(capability.missingConfig).toEqual(
      expect.arrayContaining(['PAYMOB_METHOD_REGISTRY_JSON']),
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
});
