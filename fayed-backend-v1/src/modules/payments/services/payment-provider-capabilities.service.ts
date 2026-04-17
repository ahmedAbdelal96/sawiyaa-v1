import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { PaymentProvider } from '@prisma/client';
import { PaymentProviderCapability } from '../types/payment-routing.types';
import { PaymentRuntimeConfigService } from './payment-runtime-config.service';

@Injectable()
export class PaymentProviderCapabilitiesService {
  constructor(
    private readonly paymentRuntimeConfigService: PaymentRuntimeConfigService,
  ) {}

  getCapability(provider: PaymentProvider): PaymentProviderCapability {
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
        return this.buildCapability(provider, paymob.enabled, [
          ['PAYMOB_API_KEY', paymob.apiKey],
          ['PAYMOB_HMAC_SECRET', paymob.hmacSecret],
          ['PAYMOB_INTEGRATION_ID_CARD', paymob.integrationIdCard],
          ['PAYMOB_IFRAME_ID', paymob.iframeId],
        ]);
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

  assertAvailable(provider: PaymentProvider): void {
    const capability = this.getCapability(provider);

    if (capability.available) {
      return;
    }

    const reason = capability.enabled
      ? 'missing_configuration'
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
  ): PaymentProviderCapability {
    const missingConfig = requirements
      .filter(([, value]) => !value || !value.trim())
      .map(([key]) => key);
    const configured = missingConfig.length === 0;

    return {
      provider,
      enabled,
      configured,
      available: enabled && configured,
      missingConfig,
    };
  }
}
