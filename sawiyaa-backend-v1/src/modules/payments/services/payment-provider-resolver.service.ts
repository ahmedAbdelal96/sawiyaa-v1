import { BadRequestException, Injectable } from '@nestjs/common';
import { PaymentProvider } from '@prisma/client';
import {
  PaymentRoutingContext,
  PaymentRoute,
} from '../types/payment-routing.types';
import { PaymentProviderCapabilitiesService } from './payment-provider-capabilities.service';
import { PaymentRuntimeConfigService } from './payment-runtime-config.service';

@Injectable()
export class PaymentProviderResolverService {
  constructor(
    private readonly paymentProviderCapabilitiesService: PaymentProviderCapabilitiesService,
    private readonly paymentRuntimeConfigService: PaymentRuntimeConfigService,
  ) {}

  resolveProvider(context: PaymentRoutingContext): PaymentProvider {
    return this.resolveRoute(context).provider;
  }

  resolveRoute(context: PaymentRoutingContext): PaymentRoute {
    const normalizedCurrency = context.currencyCode.trim().toUpperCase();
    if (!normalizedCurrency) this.throwRoutingUnavailable();
    const routing = this.paymentRuntimeConfigService.getPaymentRoutingConfig();
    const environment =
      typeof this.paymentRuntimeConfigService.getPaymentEnvironment === 'function'
        ? this.paymentRuntimeConfigService.getPaymentEnvironment()
        : 'development';
    const configuredRoutes = (routing.currencyRoutes ?? [])
      .filter(
        (route) =>
          route.enabled &&
          route.currencyCode === normalizedCurrency &&
          route.paymentMethod.trim().toUpperCase() === 'CARD' &&
          route.environment === environment,
      )
      .sort((left, right) => right.priority - left.priority);

    if (configuredRoutes.length !== 1) {
      if (configuredRoutes.length > 1) {
        throw new BadRequestException({
          messageKey: 'payments.errors.paymentRoutingAmbiguous',
          error: 'PAYMENT_ROUTING_AMBIGUOUS',
        });
      }
      this.throwRoutingUnavailable();
    }

    const route = configuredRoutes[0];
    if (route.source !== 'DATABASE') {
      throw new BadRequestException({
        messageKey: 'payments.errors.paymentRoutingUnavailable',
        error: 'PAYMENT_ROUTING_UNAVAILABLE',
      });
    }
    this.paymentProviderCapabilitiesService.assertAvailable(route.provider, context);
    return route;
  }

  private throwRoutingUnavailable(): never {
    throw new BadRequestException({
      messageKey: 'payments.errors.paymentRoutingUnavailable',
      error: 'PAYMENT_ROUTING_UNAVAILABLE',
    });
  }
}
