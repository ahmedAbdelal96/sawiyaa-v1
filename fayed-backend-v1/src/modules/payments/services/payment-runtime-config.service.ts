import {
  Inject,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { PaymentProvider } from '@prisma/client';
import paymentConfig from '@config/payment.config';

type StripeRuntimeConfig = {
  enabled: boolean;
  mode: 'test' | 'live';
  publishableKey: string | null;
  secretKey: string | null;
  webhookSecret: string | null;
  apiBaseUrl: string | null;
};

type PaymobRuntimeConfig = {
  enabled: boolean;
  mode: 'test' | 'live';
  apiKey: string | null;
  hmacSecret: string | null;
  baseUrl: string | null;
  integrationIdCard: string | null;
  integrationIdWallet: string | null;
  iframeId: string | null;
};

type PaymentAccountingRuntimeConfig = {
  vatEnabled: boolean;
  vatRatePercent: string;
  gatewayFeeRatePercent: string;
  gatewayFeeFixedAmount: string;
};

@Injectable()
export class PaymentRuntimeConfigService {
  constructor(
    @Inject(paymentConfig.KEY)
    private readonly paymentCfg: ConfigType<typeof paymentConfig>,
  ) {}

  getStripeConfig(): StripeRuntimeConfig {
    return {
      enabled: this.paymentCfg.stripe.enabled,
      mode: this.paymentCfg.stripe.mode,
      publishableKey: this.toNullable(this.paymentCfg.stripe.publishableKey),
      secretKey: this.toNullable(this.paymentCfg.stripe.secretKey),
      webhookSecret: this.toNullable(this.paymentCfg.stripe.webhookSecret),
      apiBaseUrl: this.toNullable(this.paymentCfg.stripe.apiBaseUrl),
    };
  }

  getPaymobConfig(): PaymobRuntimeConfig {
    return {
      enabled: this.paymentCfg.paymob.enabled,
      mode: this.paymentCfg.paymob.mode,
      apiKey: this.toNullable(this.paymentCfg.paymob.apiKey),
      hmacSecret: this.toNullable(this.paymentCfg.paymob.hmacSecret),
      baseUrl: this.toNullable(this.paymentCfg.paymob.baseUrl),
      integrationIdCard: this.toNullable(
        this.paymentCfg.paymob.integrationIdCard,
      ),
      integrationIdWallet: this.toNullable(
        this.paymentCfg.paymob.integrationIdWallet,
      ),
      iframeId: this.toNullable(this.paymentCfg.paymob.iframeId),
    };
  }

  getAccountingConfig(): PaymentAccountingRuntimeConfig {
    return {
      vatEnabled: this.paymentCfg.accounting.vatEnabled,
      vatRatePercent: this.paymentCfg.accounting.vatRatePercent,
      gatewayFeeRatePercent: this.paymentCfg.accounting.gatewayFeeRatePercent,
      gatewayFeeFixedAmount: this.paymentCfg.accounting.gatewayFeeFixedAmount,
    };
  }

  getRedirectUrls(): {
    success: string;
    failed: string;
    pending: string;
  } {
    const success = this.paymentCfg.redirectUrls.success;
    const failed = this.paymentCfg.redirectUrls.failed;
    const pending = this.paymentCfg.redirectUrls.pending;

    if (!success || !failed || !pending) {
      throw new ServiceUnavailableException({
        messageKey: 'payments.errors.providerNotConfigured',
        error: 'PAYMENT_PROVIDER_NOT_CONFIGURED',
      });
    }

    return {
      success,
      failed,
      pending,
    };
  }

  assertCheckoutConfigured(provider: PaymentProvider): void {
    if (provider === PaymentProvider.STRIPE) {
      const stripe = this.getStripeConfig();

      if (!stripe.enabled || !stripe.secretKey || !stripe.apiBaseUrl) {
        this.throwProviderNotConfigured(PaymentProvider.STRIPE);
      }

      return;
    }

    if (provider === PaymentProvider.PAYMOB) {
      const paymob = this.getPaymobConfig();

      if (
        !paymob.enabled ||
        !paymob.apiKey ||
        !paymob.baseUrl ||
        !paymob.integrationIdCard ||
        !paymob.iframeId
      ) {
        this.throwProviderNotConfigured(PaymentProvider.PAYMOB);
      }

      return;
    }
  }

  assertWebhookConfigured(provider: PaymentProvider): void {
    if (provider === PaymentProvider.STRIPE) {
      const stripe = this.getStripeConfig();
      if (!stripe.enabled || !stripe.webhookSecret) {
        this.throwProviderWebhookNotConfigured(PaymentProvider.STRIPE);
      }
      return;
    }

    if (provider === PaymentProvider.PAYMOB) {
      const paymob = this.getPaymobConfig();
      if (!paymob.enabled || !paymob.hmacSecret) {
        this.throwProviderWebhookNotConfigured(PaymentProvider.PAYMOB);
      }
      return;
    }
  }

  isTestMode(provider: PaymentProvider): boolean {
    if (provider === PaymentProvider.STRIPE) {
      return this.getStripeConfig().mode === 'test';
    }

    if (provider === PaymentProvider.PAYMOB) {
      return this.getPaymobConfig().mode === 'test';
    }

    return true;
  }

  isDevelopmentEnvironment(): boolean {
    return this.paymentCfg.isDevelopment;
  }

  private throwProviderNotConfigured(provider: PaymentProvider): never {
    throw new ServiceUnavailableException({
      messageKey: 'payments.errors.providerNotConfigured',
      error: 'PAYMENT_PROVIDER_NOT_CONFIGURED',
      messageParams: { provider },
    });
  }

  private throwProviderWebhookNotConfigured(provider: PaymentProvider): never {
    throw new ServiceUnavailableException({
      messageKey: 'payments.errors.providerWebhookNotConfigured',
      error: 'PAYMENT_PROVIDER_WEBHOOK_NOT_CONFIGURED',
      messageParams: { provider },
    });
  }

  private toNullable(value: string | undefined | null): string | null {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
  }
}
