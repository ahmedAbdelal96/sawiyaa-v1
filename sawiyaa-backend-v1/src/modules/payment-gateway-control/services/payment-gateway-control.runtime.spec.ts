import paymentConfig from '@config/payment.config';
import { PaymentGatewayControlRuntimeService } from './payment-gateway-control.runtime';

describe('PaymentGatewayControlRuntimeService', () => {
  it('merges runtime control values from the config engine', async () => {
    const resolveConfigValueUseCase = {
      execute: jest.fn(async (key: string) => {
        switch (key) {
          case 'payment.provider.paymob.enabled':
            return { value: true, source: 'database', dataType: 'BOOLEAN' };
          case 'payment.provider.paymob.checkoutFlow':
            return {
              value: 'intention',
              source: 'database',
              dataType: 'STRING',
            };
          case 'payment.provider.paymob.defaultMethod':
            return { value: 'WALLET', source: 'database', dataType: 'STRING' };
          case 'payment.provider.paymob.maintenanceMode':
            return { value: true, source: 'database', dataType: 'BOOLEAN' };
          case 'payment.provider.paymob.allowedCountries':
            return {
              value: ['EG'],
              source: 'database',
              dataType: 'STRING_ARRAY',
            };
          case 'payment.provider.paymob.methodRegistry':
            return {
              value: [
                {
                  key: 'WALLET',
                  label: 'Mobile Wallet',
                  type: 'WALLET',
                  enabled: true,
                  priority: 90,
                  supportedCheckoutFlows: ['intention'],
                  countryIsoCodes: ['EG'],
                  integrationId: '900000',
                },
              ],
              source: 'database',
              dataType: 'JSON',
            };
          default:
            return { value: null, source: 'missing', dataType: 'STRING' };
        }
      }),
    };

    const service = new PaymentGatewayControlRuntimeService(
      {
        paymob: {
          enabled: true,
          mode: 'test',
          apiKey: 'api-key',
          publicKey: 'public-key',
          hmacSecret: 'hmac-secret',
          baseUrl: 'https://example.com',
          intentionBaseUrl: 'https://flashapi.paymob.com',
          checkoutBaseUrl: 'https://flashapi.paymob.com',
          checkoutFlow: 'legacy',
          methodRegistryJson: JSON.stringify([
            {
              key: 'CARD',
              label: 'Card',
              type: 'CARD',
              enabled: true,
              priority: 100,
              supportedCheckoutFlows: ['legacy', 'intention'],
              countryIsoCodes: ['EG'],
              integrationId: '5611307',
            },
          ]),
          integrationIdCard: '5611307',
          integrationIdWallet: null,
          iframeId: '1031182',
          defaultCheckoutMethod: 'CARD',
        },
        accounting: {
          vatEnabled: false,
          vatRatePercent: '0',
          gatewayFeeRatePercent: '0',
          gatewayFeeFixedAmount: '0',
        },
        redirectUrls: {
          success: 'https://app.local/success',
          failed: 'https://app.local/failed',
          pending: 'https://app.local/pending',
        },
        appEnv: 'development',
        isDevelopment: true,
        appBaseUrl: 'https://app.local',
        stripe: {
          enabled: false,
          mode: 'test',
          publishableKey: null,
          secretKey: null,
          webhookSecret: null,
          apiBaseUrl: null,
        },
      } as unknown as ReturnType<typeof paymentConfig>,
      resolveConfigValueUseCase as never,
    );

    const snapshot = await service.refreshPaymobSnapshot();

    expect(snapshot.checkoutFlow).toBe('intention');
    expect(snapshot.maintenanceMode).toBe(true);
    expect(snapshot.allowedCountryIsoCodes).toEqual(['EG']);
    expect(service.getPaymobEnabledMethods()).toHaveLength(0);
    expect(service.getPaymobSnapshot().validation.healthy).toBe(true);
  });
});
