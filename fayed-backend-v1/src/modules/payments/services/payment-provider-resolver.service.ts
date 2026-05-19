import { BadRequestException, Injectable } from '@nestjs/common';
import { MarketType, PaymentProvider } from '@prisma/client';
import { resolveProviderForCurrency } from '@common/payments/payment-region.resolver';
import {
  PaymentRoutingContext,
  PaymentRoutingMarket,
} from '../types/payment-routing.types';
import { PaymentProviderCapabilitiesService } from './payment-provider-capabilities.service';
import { PaymentRuntimeConfigService } from './payment-runtime-config.service';

@Injectable()
export class PaymentProviderResolverService {
  private static readonly EGYPT_ISO_CODE = 'EGY';

  constructor(
    private readonly paymentProviderCapabilitiesService: PaymentProviderCapabilitiesService,
    private readonly paymentRuntimeConfigService: PaymentRuntimeConfigService,
  ) {}

  resolveProvider(context: PaymentRoutingContext): PaymentProvider {
    const normalizedCurrency = context.currencyCode.trim().toUpperCase();
    const normalizedOperatingCountry =
      context.operatingCountryIsoCode?.trim().toUpperCase() ?? null;
    const normalizedCheckoutCountry =
      context.checkoutCountryIsoCode?.trim().toUpperCase() ?? null;

    if (!normalizedCurrency || !context.commissionMarketType) {
      throw new BadRequestException({
        messageKey: 'payments.errors.paymentRoutingAmbiguous',
        error: 'PAYMENT_ROUTING_AMBIGUOUS',
      });
    }

    const market = this.resolveRoutingMarket({
      commissionMarketType: context.commissionMarketType,
      operatingCountryIsoCode: normalizedOperatingCountry,
      checkoutCountryIsoCode: normalizedCheckoutCountry,
    });
    const provider = this.resolveProviderByMarketAndCurrency({
      market,
      currencyCode: normalizedCurrency,
      operatingCountryIsoCode: normalizedOperatingCountry,
    });
    const routing = this.paymentRuntimeConfigService.getPaymentRoutingConfig();
    const orderedProviders = this.orderProvidersByRoutingPreference(
      [provider],
      routing,
    );

    for (const candidate of orderedProviders) {
      try {
        this.paymentProviderCapabilitiesService.assertAvailable(
          candidate,
          context,
        );
        return candidate;
      } catch {
        continue;
      }
    }

    this.paymentProviderCapabilitiesService.assertAvailable(provider, context);

    return provider;
  }

  private resolveRoutingMarket(input: {
    commissionMarketType: MarketType;
    operatingCountryIsoCode: string | null;
    checkoutCountryIsoCode: string | null;
  }): PaymentRoutingMarket {
    if (input.commissionMarketType === MarketType.CROSS_BORDER) {
      return 'INTERNATIONAL';
    }

    if (input.commissionMarketType === MarketType.LOCAL) {
      if (!input.operatingCountryIsoCode || !input.checkoutCountryIsoCode) {
        throw new BadRequestException({
          messageKey: 'payments.errors.paymentRoutingAmbiguous',
          error: 'PAYMENT_ROUTING_AMBIGUOUS',
        });
      }

      if (input.operatingCountryIsoCode !== input.checkoutCountryIsoCode) {
        throw new BadRequestException({
          messageKey: 'payments.errors.paymentRoutingAmbiguous',
          error: 'PAYMENT_ROUTING_AMBIGUOUS',
        });
      }

      return input.operatingCountryIsoCode ===
        PaymentProviderResolverService.EGYPT_ISO_CODE
        ? 'EGYPT_LOCAL'
        : 'INTERNATIONAL';
    }

    if (
      input.commissionMarketType === MarketType.ANY &&
      input.operatingCountryIsoCode &&
      input.checkoutCountryIsoCode
    ) {
      if (input.operatingCountryIsoCode !== input.checkoutCountryIsoCode) {
        return 'INTERNATIONAL';
      }

      return input.operatingCountryIsoCode ===
        PaymentProviderResolverService.EGYPT_ISO_CODE
        ? 'EGYPT_LOCAL'
        : 'INTERNATIONAL';
    }

    throw new BadRequestException({
      messageKey: 'payments.errors.paymentRoutingAmbiguous',
      error: 'PAYMENT_ROUTING_AMBIGUOUS',
    });
  }

  private resolveProviderByMarketAndCurrency(input: {
    market: PaymentRoutingMarket;
    currencyCode: string;
    operatingCountryIsoCode: string | null;
  }): PaymentProvider {
    const provider = resolveProviderForCurrency(input.currencyCode);
    if (provider) {
      return provider;
    }

    throw new BadRequestException({
      messageKey: 'payments.errors.unsupportedRoutingCombination',
      error: 'PAYMENT_UNSUPPORTED_ROUTING_COMBINATION',
      messageParams: {
        market: input.market,
        currencyCode: input.currencyCode,
      },
    });
  }

  private orderProvidersByRoutingPreference(
    candidates: PaymentProvider[],
    routing: ReturnType<PaymentRuntimeConfigService['getPaymentRoutingConfig']>,
  ): PaymentProvider[] {
    const priority = routing.priorityOrder;
    const fallback = routing.fallbackProvider ? [routing.fallbackProvider] : [];
    const preferred = routing.defaultProvider ? [routing.defaultProvider] : [];

    return Array.from(
      new Set([...preferred, ...fallback, ...priority, ...candidates]),
    ).filter((provider) => candidates.includes(provider));
  }
}
