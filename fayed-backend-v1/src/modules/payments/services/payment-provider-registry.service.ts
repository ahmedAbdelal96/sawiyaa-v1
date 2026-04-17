import { Injectable, NotFoundException } from '@nestjs/common';
import { PaymentProvider } from '@prisma/client';
import { PaymobPaymentProviderAdapter } from '../providers/paymob-payment-provider.adapter';
import { PaymentProviderAdapter } from '../providers/payment-provider-adapter.interface';
import { StripePaymentProviderAdapter } from '../providers/stripe-payment-provider.adapter';
import { PaymentProviderCapabilitiesService } from './payment-provider-capabilities.service';

@Injectable()
export class PaymentProviderRegistryService {
  private readonly adapters: Map<PaymentProvider, PaymentProviderAdapter>;

  constructor(
    stripePaymentProviderAdapter: StripePaymentProviderAdapter,
    paymobPaymentProviderAdapter: PaymobPaymentProviderAdapter,
    private readonly paymentProviderCapabilitiesService: PaymentProviderCapabilitiesService,
  ) {
    this.adapters = new Map<PaymentProvider, PaymentProviderAdapter>();
    this.adapters.set(
      stripePaymentProviderAdapter.provider,
      stripePaymentProviderAdapter,
    );
    this.adapters.set(
      paymobPaymentProviderAdapter.provider,
      paymobPaymentProviderAdapter,
    );
  }

  get(provider: PaymentProvider): PaymentProviderAdapter {
    this.paymentProviderCapabilitiesService.assertAvailable(provider);

    const adapter = this.adapters.get(provider);

    if (!adapter) {
      throw new NotFoundException({
        messageKey: 'payments.errors.providerNotFound',
        error: 'PAYMENT_PROVIDER_NOT_FOUND',
        messageParams: { provider },
      });
    }

    return adapter;
  }
}
