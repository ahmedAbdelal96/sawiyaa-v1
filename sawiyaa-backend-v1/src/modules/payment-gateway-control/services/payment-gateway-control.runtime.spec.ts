import paymentConfig from '@config/payment.config';
import { PaymentProvider } from '@prisma/client';
import { PaymentProviderCapabilitiesService } from '@modules/payments/services/payment-provider-capabilities.service';
import { PaymentProviderResolverService } from '@modules/payments/services/payment-provider-resolver.service';
import { PaymentRuntimeConfigService } from '@modules/payments/services/payment-runtime-config.service';
import { PaymentGatewayControlRuntimeService } from './payment-gateway-control.runtime';

function buildControlledRuntime(options: {
  enabledSource: 'database' | 'missing';
  enabledValue: boolean | null;
  apiKey?: string | null;
}) {
  const paymentConfiguration = {
    paymob: {
      enabled: true,
      mode: 'test',
      apiKey: options.apiKey === undefined ? 'paymob-api-key' : options.apiKey,
      publicKey: null,
      hmacSecret: 'paymob-hmac-secret',
      baseUrl: 'https://accept.paymob.com/api',
      intentionBaseUrl: 'https://flashapi.paymob.com',
      checkoutBaseUrl: 'https://flashapi.paymob.com',
      checkoutFlow: 'legacy',
      egpCardIntegrationId: 'egp-card-test-integration',
      egpWalletIntegrationId: null,
      usdCardIntegrationId: null,
      integrationIdCard: 'egp-card-test-integration',
      integrationIdWallet: null,
      iframeId: 'paymob-iframe-test',
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
  } as unknown as ReturnType<typeof paymentConfig>;

  const configRuntimeService = {
    resolveValue: jest.fn((key: string) => {
      if (key === 'payment.provider.paymob.enabled') {
        return {
          value: options.enabledValue,
          source: options.enabledSource,
          dataType: 'BOOLEAN',
        };
      }

      return { value: null, source: 'missing', dataType: 'STRING' };
    }),
  };

  const runtime = new PaymentGatewayControlRuntimeService(
    paymentConfiguration,
    configRuntimeService as never,
  );

  return { runtime, paymentConfiguration, configRuntimeService };
}

function setEgpCardRoute(runtime: PaymentGatewayControlRuntimeService): void {
  runtime.updateRoutingSnapshot({
    defaultProvider: null,
    priorityOrder: [],
    fallbackProvider: null,
    currencyRoutes: [
      {
        currencyCode: 'EGP',
        paymentMethod: 'CARD',
        provider: PaymentProvider.PAYMOB,
        integrationKey: 'paymob-egp-card',
        environment: 'production',
        enabled: true,
        priority: 100,
        source: 'DATABASE',
      },
    ],
    routeReadiness: [],
    routeCatalog: [],
    validation: { healthy: true, issues: [] },
    sources: {
      defaultProvider: 'config',
      priorityOrder: 'config',
      fallbackProvider: 'config',
      currencyRoutes: 'config',
    },
    updatedAt: null,
  });
}

describe('PaymentGatewayControlRuntimeService', () => {
  it('initializes providers before routing and logs the final ready state', async () => {
    const { paymentConfiguration } = buildControlledRuntime({
      enabledSource: 'database',
      enabledValue: true,
    });
    const configValues: Record<string, unknown> = {
      'payment.provider.paymob.enabled': true,
      'payment.provider.paymob.checkoutFlow': 'legacy',
      'payment.provider.paymob.defaultMethod': 'CARD',
      'payment.provider.paymob.maintenanceMode': false,
      'payment.provider.paymob.allowedCountries': ['EG'],
      'payment.provider.paymob.methodRegistry': [
        {
          key: 'CARD',
          label: 'Card',
          type: 'CARD',
          enabled: true,
          priority: 100,
          supportedCheckoutFlows: ['legacy'],
          currencyCodes: ['EGP'],
          countryIsoCodes: ['EG'],
          integrationId: 'paymob-egp-card',
        },
      ],
      'payment.routing.currencyRoutes': [
        {
          currencyCode: 'EGP',
          paymentMethod: 'CARD',
          provider: PaymentProvider.PAYMOB,
          integrationKey: 'paymob-egp-card',
          environment: 'production',
          enabled: true,
          priority: 100,
          source: 'DATABASE',
        },
      ],
    };
    const configRuntimeService = {
      resolveValue: jest.fn(async (key: string) => ({
        value: configValues[key] ?? null,
        source: configValues[key] === undefined ? 'missing' : 'database',
        dataType: 'JSON',
      })),
    };
    const runtime = new PaymentGatewayControlRuntimeService(
      paymentConfiguration,
      configRuntimeService as never,
    );
    const originalLoadProvider = (runtime as never as {
      loadProviderSnapshot: (provider: PaymentProvider) => Promise<unknown>;
    }).loadProviderSnapshot.bind(runtime);
    const originalLoadRouting = (runtime as never as {
      loadRoutingSnapshot: () => Promise<unknown>;
    }).loadRoutingSnapshot.bind(runtime);
    let releasePaymob!: () => void;
    const paymobLoaded = new Promise<void>((resolve) => {
      releasePaymob = resolve;
    });
    let routingStarted = false;
    jest
      .spyOn(runtime as never as object, 'loadProviderSnapshot' as never)
      .mockImplementation(async (provider: PaymentProvider) => {
        if (provider === PaymentProvider.PAYMOB) {
          await paymobLoaded;
        }
        return originalLoadProvider(provider);
      });
    jest
      .spyOn(runtime as never as object, 'loadRoutingSnapshot' as never)
      .mockImplementation(async () => {
        routingStarted = true;
        return originalLoadRouting();
      });
    const diagnosticLog = jest.spyOn(
      (runtime as never as { logger: { log: (message: string) => void } }).logger,
      'log',
    );

    const initialization = runtime.onModuleInit();
    await new Promise((resolve) => setImmediate(resolve));
    expect(routingStarted).toBe(false);
    releasePaymob();
    await initialization;

    const routing = runtime.getRoutingSnapshot();
    expect(routing.routeReadiness).toEqual([
      expect.objectContaining({
        ready: true,
        route: expect.objectContaining({
          currencyCode: 'EGP',
          paymentMethod: 'CARD',
          provider: PaymentProvider.PAYMOB,
          integrationKey: 'paymob-egp-card',
        }),
      }),
    ]);
    expect(diagnosticLog).toHaveBeenCalledWith(
      expect.stringContaining('EGP/CARD -> PAYMOB/paymob-egp-card (production, ready)'),
    );
  });

  it('proves enabled EGP/CARD controls reach READY through resolver and capabilities', async () => {
    const { runtime, paymentConfiguration } = buildControlledRuntime({
      enabledSource: 'database',
      enabledValue: true,
    });
    await runtime.refreshPaymobSnapshot();
    runtime.updateRoutingSnapshot({
      defaultProvider: null,
      priorityOrder: [],
      fallbackProvider: null,
      currencyRoutes: [
        {
          currencyCode: 'EGP',
          paymentMethod: 'CARD',
          provider: PaymentProvider.PAYMOB,
          integrationKey: 'paymob-egp-card',
          environment: 'development',
          enabled: true,
          priority: 100,
          source: 'DATABASE',
        },
      ],
      routeReadiness: [],
      routeCatalog: [],
      validation: { healthy: true, issues: [] },
      sources: {
        defaultProvider: 'config',
        priorityOrder: 'config',
        fallbackProvider: 'config',
        currencyRoutes: 'config',
      },
      updatedAt: null,
    });

    expect(runtime.getPaymobSnapshot().controlState).toBe('DATABASE_ENABLED');
    const paymentRuntime = new PaymentRuntimeConfigService(
      paymentConfiguration,
      {} as never,
      runtime,
    );
    const capabilities = new PaymentProviderCapabilitiesService(paymentRuntime);
    const resolver = new PaymentProviderResolverService(capabilities, paymentRuntime);
    expect(
      capabilities.getCapability(PaymentProvider.PAYMOB, { currencyCode: 'EGP' }),
    ).toMatchObject({ available: true, supportedMethods: ['CARD'] });
    expect(
      resolver.resolveRoute({
        currencyCode: 'EGP',
        commissionMarketType: 'LOCAL' as never,
        operatingCountryIsoCode: 'EGY',
        checkoutCountryIsoCode: 'EGY',
      }),
    ).toMatchObject({
      provider: PaymentProvider.PAYMOB,
      integrationKey: 'paymob-egp-card',
      source: 'DATABASE',
    });
  });

  it('does not let valid environment credentials override an explicit database disable', async () => {
    const { runtime, paymentConfiguration } = buildControlledRuntime({
      enabledSource: 'database',
      enabledValue: false,
    });
    await runtime.refreshPaymobSnapshot();

    expect(runtime.getPaymobSnapshot().controlState).toBe('DATABASE_DISABLED');
    expect(runtime.getPaymobSnapshot().enabled).toBe(false);
    expect(runtime.getPaymobSnapshot().methodRegistry).not.toHaveLength(0);

    const paymentRuntime = new PaymentRuntimeConfigService(
      paymentConfiguration,
      {} as never,
      runtime,
    );
    expect(
      new PaymentProviderCapabilitiesService(paymentRuntime).getCapability(
        PaymentProvider.PAYMOB,
        { currencyCode: 'EGP' },
      ),
    ).toMatchObject({ available: false, enabled: false });
  });

  it('keeps the EGP route not-ready when the Paymob integration alias is missing', async () => {
    const { runtime, paymentConfiguration } = buildControlledRuntime({
      enabledSource: 'database',
      enabledValue: true,
    });
    paymentConfiguration.paymob.egpCardIntegrationId = null;
    await runtime.refreshPaymobSnapshot();
    setEgpCardRoute(runtime);

    expect(runtime.getRoutingSnapshot().routeReadiness[0]).toMatchObject({
      ready: false,
      issues: expect.arrayContaining(['PAYMOB_EGP_CARD_INTEGRATION_ID']),
    });
  });

  it('keeps the EGP route not-ready while Paymob is in maintenance mode', async () => {
    const { runtime, configRuntimeService } = buildControlledRuntime({
      enabledSource: 'database',
      enabledValue: true,
    });
    configRuntimeService.resolveValue.mockImplementation((key: string) => {
      if (key === 'payment.provider.paymob.maintenanceMode') {
        return {
          value: true,
          source: 'database',
          dataType: 'BOOLEAN',
        };
      }
      if (key === 'payment.provider.paymob.enabled') {
        return {
          value: true,
          source: 'database',
          dataType: 'BOOLEAN',
        };
      }
      return { value: null, source: 'missing', dataType: 'STRING' };
    });
    await runtime.refreshPaymobSnapshot();
    setEgpCardRoute(runtime);

    expect(runtime.getRoutingSnapshot().routeReadiness[0]).toMatchObject({
      ready: false,
      issues: expect.arrayContaining(['PAYMOB_MAINTENANCE_MODE']),
    });
  });

  it('keeps an uninitialized database control unavailable', async () => {
    const { runtime } = buildControlledRuntime({
      enabledSource: 'missing',
      enabledValue: null,
    });
    await runtime.refreshPaymobSnapshot();

    expect(runtime.getPaymobSnapshot().controlState).toBe('UNINITIALIZED');
    expect(runtime.getPaymobSnapshot().enabled).toBe(false);
  });

  it('reports the exact missing Paymob credential when enabled controls are ready to evaluate', async () => {
    const { runtime } = buildControlledRuntime({
      enabledSource: 'database',
      enabledValue: true,
      apiKey: null,
    });
    const snapshot = await runtime.refreshPaymobSnapshot();

    expect(snapshot.controlState).toBe('DATABASE_ENABLED');
    expect(snapshot.validation.healthy).toBe(false);
    expect(snapshot.validation.issues).toContain(
      'Paymob runtime config is missing required fields: PAYMOB_API_KEY',
    );
  });

  it('merges runtime control values from the config engine', async () => {
    const configRuntimeService = {
      resolveValue: jest.fn((key: string) => {
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
      configRuntimeService as never,
    );

    const snapshot = await service.refreshPaymobSnapshot();

    expect(snapshot.checkoutFlow).toBe('intention');
    expect(snapshot.maintenanceMode).toBe(true);
    expect(snapshot.allowedCountryIsoCodes).toEqual(['EG']);
    expect(service.getPaymobEnabledMethods()).toHaveLength(0);
    expect(service.getPaymobSnapshot().validation.healthy).toBe(true);
  });
});
