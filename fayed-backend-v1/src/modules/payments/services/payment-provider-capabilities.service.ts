import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { PaymentProvider } from '@prisma/client';
import { PaymobCheckoutFlow } from '../types/paymob-payment.types';
import { PaymentProviderCapability } from '../types/payment-routing.types';
import { PaymentRuntimeConfigService } from './payment-runtime-config.service';

@Injectable()
export class PaymentProviderCapabilitiesService {
  constructor(
    private readonly paymentRuntimeConfigService: PaymentRuntimeConfigService,
  ) {}

  getCapability(
    provider: PaymentProvider,
    context?: {
      currencyCode?: string | null;
      checkoutCountryIsoCode?: string | null;
      operatingCountryIsoCode?: string | null;
    },
  ): PaymentProviderCapability {
    switch (provider) {
      case PaymentProvider.STRIPE: {
        const stripe = this.paymentRuntimeConfigService.getStripeConfig();
        return this.buildCapability(provider, stripe.enabled, [
          ['STRIPE_SECRET_KEY', stripe.secretKey],
          ['STRIPE_WEBHOOK_SECRET', stripe.webhookSecret],
        ]);
      }
      case PaymentProvider.PAYMOB: {
        const paymob = this.paymentRuntimeConfigService.getPaymobConfig();
        const enabledMethods =
          this.paymentRuntimeConfigService.getPaymobEnabledMethods(context);
        const isIntentionFlow =
          paymob.checkoutFlow === PaymobCheckoutFlow.INTENTION;
        const requirements: Array<
          [key: string, value: string | undefined | null]
        > = [
          ['PAYMOB_API_KEY', paymob.apiKey],
          ['PAYMOB_HMAC_SECRET', paymob.hmacSecret],
          ['PAYMOB_BASE_URL', paymob.baseUrl],
        ];

        if (isIntentionFlow) {
          requirements.push(
            ['PAYMOB_INTENTION_BASE_URL', paymob.intentionBaseUrl],
            ['PAYMOB_CHECKOUT_BASE_URL', paymob.checkoutBaseUrl],
            ['PAYMOB_PUBLIC_KEY', paymob.publicKey],
          );
        } else {
          requirements.push(['PAYMOB_IFRAME_ID', paymob.iframeId]);
        }

        return this.buildCapability(provider, paymob.enabled, requirements, {
          currencyCode: context?.currencyCode ?? null,
          checkoutFlow: paymob.checkoutFlow,
          maintenanceMode: paymob.maintenanceMode,
          methods: enabledMethods.map((item) => ({
            key: item.key,
            label: item.label,
            type: item.type,
            enabled: item.enabled,
          })),
          supportedMethods: enabledMethods.map((item) => item.key),
          defaultMethod:
            this.paymentRuntimeConfigService.getPaymobDefaultCheckoutMethod(
              context,
            ),
        });
      }
      default:
        return {
          provider,
          enabled: false,
          configured: false,
          available: false,
          missingConfig: ['UNSUPPORTED_PROVIDER'],
        };
    }
  }

  assertAvailable(
    provider: PaymentProvider,
    context?: {
      currencyCode?: string | null;
      checkoutCountryIsoCode?: string | null;
      operatingCountryIsoCode?: string | null;
    },
  ): void {
    const capability = this.getCapability(provider, context);

    if (capability.available) {
      return;
    }

    const reason = capability.enabled
      ? capability.maintenanceMode
        ? 'provider_maintenance'
        : 'missing_configuration'
      : 'provider_disabled';

    throw new ServiceUnavailableException({
      messageKey: 'payments.errors.providerUnavailable',
      error: 'PAYMENT_PROVIDER_UNAVAILABLE',
      messageParams: {
        provider,
        reason,
      },
      details: {
        missingConfig: capability.missingConfig,
      },
    });
  }

  private buildCapability(
    provider: PaymentProvider,
    enabled: boolean,
    requirements: Array<[key: string, value: string | undefined | null]>,
    extras?: {
      currencyCode?: string | null;
      checkoutFlow?: 'legacy' | 'intention';
      maintenanceMode?: boolean;
      methods?: Array<{
        key: string;
        label: string;
        type: string;
        enabled: boolean;
      }>;
      supportedMethods?: string[];
      defaultMethod?: string | null;
    },
  ): PaymentProviderCapability {
    const missingConfig = requirements
      .filter(([, value]) => !value || !value.trim())
      .map(([key]) => key);

    if (provider === PaymentProvider.PAYMOB) {
      const normalizedCurrency =
        typeof extras?.currencyCode === 'string'
          ? extras.currencyCode.trim().toUpperCase()
          : null;

      if (!extras?.supportedMethods || extras.supportedMethods.length === 0) {
        if (normalizedCurrency === 'USD') {
          missingConfig.push('PAYMOB_USD_CARD_INTEGRATION_ID');
        } else if (normalizedCurrency === 'EGP') {
          missingConfig.push('PAYMOB_EGP_CARD_INTEGRATION_ID');
        } else {
          missingConfig.push('PAYMOB_METHOD_CONFIGURATION');
        }
      }
    }

    const configured = missingConfig.length === 0;

    return {
      provider,
      enabled,
      configured,
      available: enabled && configured && !extras?.maintenanceMode,
      missingConfig,
      checkoutFlow: extras?.checkoutFlow ?? undefined,
      methods: extras?.methods ?? [],
      supportedMethods: extras?.supportedMethods ?? [],
      defaultMethod: extras?.defaultMethod ?? null,
      maintenanceMode: extras?.maintenanceMode ?? false,
    };
  }
}
