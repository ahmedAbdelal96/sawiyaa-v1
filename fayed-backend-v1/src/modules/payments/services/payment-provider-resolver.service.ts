import { BadRequestException, Injectable } from '@nestjs/common';
import { MarketType, PaymentProvider } from '@prisma/client';
import {
  PaymentRoutingContext,
  PaymentRoutingMarket,
} from '../types/payment-routing.types';
import { PaymentProviderCapabilitiesService } from './payment-provider-capabilities.service';

@Injectable()
export class PaymentProviderResolverService {
  private static readonly EGYPT_ISO_CODE = 'EGY';

  constructor(
    private readonly paymentProviderCapabilitiesService: PaymentProviderCapabilitiesService,
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

    this.paymentProviderCapabilitiesService.assertAvailable(provider);

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
    if (input.market === 'EGYPT_LOCAL' && input.currencyCode === 'EGP') {
      return PaymentProvider.PAYMOB;
    }

    if (input.market === 'INTERNATIONAL' && input.currencyCode === 'USD') {
      return PaymentProvider.STRIPE;
    }

    if (
      input.currencyCode === 'USD' &&
      input.operatingCountryIsoCode &&
      input.operatingCountryIsoCode !==
        PaymentProviderResolverService.EGYPT_ISO_CODE
    ) {
      return PaymentProvider.STRIPE;
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
}
