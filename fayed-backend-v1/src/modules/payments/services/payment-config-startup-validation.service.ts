import { Injectable, OnModuleInit } from '@nestjs/common';
import { PaymentProvider } from '@prisma/client';
import { PaymentRuntimeConfigService } from './payment-runtime-config.service';

@Injectable()
export class PaymentConfigStartupValidationService implements OnModuleInit {
  constructor(
    private readonly paymentRuntimeConfigService: PaymentRuntimeConfigService,
  ) {}

  onModuleInit(): void {
    const issues: string[] = [];
    const isDevelopment = this.paymentRuntimeConfigService.isDevelopmentEnvironment();
    const stripe = this.paymentRuntimeConfigService.getStripeConfig();
    const paymob = this.paymentRuntimeConfigService.getPaymobConfig();

    if (stripe.enabled) {
      try {
        this.paymentRuntimeConfigService.assertCheckoutConfigured(
          PaymentProvider.STRIPE,
        );
        this.paymentRuntimeConfigService.assertWebhookConfigured(
          PaymentProvider.STRIPE,
        );
      } catch {
        issues.push('Stripe is enabled but required Stripe checkout/webhook env is missing.');
      }
    }

    if (paymob.enabled) {
      try {
        this.paymentRuntimeConfigService.assertCheckoutConfigured(
          PaymentProvider.PAYMOB,
        );
        this.paymentRuntimeConfigService.assertWebhookConfigured(
          PaymentProvider.PAYMOB,
        );
      } catch {
        issues.push('Paymob is enabled but required Paymob checkout/webhook env is missing.');
      }
    }

    if (stripe.enabled || paymob.enabled) {
      try {
        this.paymentRuntimeConfigService.getRedirectUrls();
      } catch {
        issues.push(
          'Payment redirect URLs are missing. Set PAYMENT_SUCCESS_URL, PAYMENT_FAILED_URL, and PAYMENT_PENDING_URL.',
        );
      }
    }

    if (isDevelopment) {
      if (stripe.enabled && stripe.mode === 'live') {
        issues.push(
          'Stripe mode is live while APP_ENV/NODE_ENV is non-production. Use STRIPE_MODE=test in development.',
        );
      }

      if (paymob.enabled && paymob.mode === 'live') {
        issues.push(
          'Paymob mode is live while APP_ENV/NODE_ENV is non-production. Use PAYMOB_MODE=test in development.',
        );
      }

      if (stripe.secretKey?.startsWith('sk_live_')) {
        issues.push(
          'Live Stripe secret key detected in non-production environment.',
        );
      }
    }

    if (issues.length > 0) {
      throw new Error(
        `[Payment Config] Invalid payment environment configuration:\n- ${issues.join(
          '\n- ',
        )}`,
      );
    }
  }
}
