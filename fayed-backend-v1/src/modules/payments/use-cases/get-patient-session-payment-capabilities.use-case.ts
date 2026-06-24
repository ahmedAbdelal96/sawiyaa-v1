import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PaymentProvider, Prisma } from '@prisma/client';
import { CustomerWalletAccountingService } from '@modules/customer-wallets/services/customer-wallet-accounting.service';
import { PaymentSessionRepository } from '../repositories/payment-session.repository';
import { PaymentRuntimeConfigService } from '../services/payment-runtime-config.service';
import { ResolveSessionPaymentPricingService } from '../services/resolve-session-payment-pricing.service';
import { PaymobCheckoutFlow } from '../types/paymob-payment.types';
import {
  PaymentCapabilityMethodViewModel,
  PaymentWalletCapabilityViewModel,
} from '../types/payment-routing.types';

@Injectable()
export class GetPatientSessionPaymentCapabilitiesUseCase {
  constructor(
    private readonly paymentSessionRepository: PaymentSessionRepository,
    private readonly paymentRuntimeConfigService: PaymentRuntimeConfigService,
    private readonly resolveSessionPaymentPricingService: ResolveSessionPaymentPricingService,
    private readonly customerWalletAccountingService: CustomerWalletAccountingService,
  ) {}

  async execute(input: { userId: string; sessionId: string }) {
    const session = await this.paymentSessionRepository.findPatientOwnedSession(
      input.sessionId,
      input.userId,
    );

    if (!session) {
      throw new NotFoundException({
        messageKey: 'payments.errors.sessionNotFound',
        error: 'PAYMENT_SESSION_NOT_FOUND',
      });
    }

    const pricing = await this.resolveSessionPaymentPricingService.resolve({
      session,
      couponCode: null,
    });

    const checkoutCountryIsoCode = session.patient.country?.isoCode ?? null;
    if (!checkoutCountryIsoCode) {
      throw new BadRequestException({
        messageKey: 'payments.errors.paymentRoutingAmbiguous',
        error: 'PAYMENT_ROUTING_AMBIGUOUS',
      });
    }

    const context = {
      currencyCode: pricing.currencyCode,
      checkoutCountryIsoCode,
      operatingCountryIsoCode: session.practitioner.country?.isoCode ?? null,
    };

    const availableWalletBalance =
      await this.customerWalletAccountingService.getAvailableBalance({
        patientId: session.patient.id,
        currencyCode: pricing.currencyCode,
      });

    const totalAmountDecimal = new Prisma.Decimal(pricing.amountTotal);
    const walletEnabled = availableWalletBalance.gt(0);
    const walletCapability: PaymentWalletCapabilityViewModel = {
      enabled: walletEnabled,
      availableBalance: availableWalletBalance.toFixed(2),
      currencyCode: pricing.currencyCode,
      canUseFullAmount:
        walletEnabled && availableWalletBalance.gte(totalAmountDecimal),
      canUsePartialAmount:
        walletEnabled && availableWalletBalance.lt(totalAmountDecimal),
    };

    const paymobMethods = this.paymentRuntimeConfigService
      .getPaymobEnabledMethods(context)
      .map((item) => ({
        key: item.key,
        label: item.label,
        type: item.type,
        enabled: item.enabled,
      }));

    let methods = paymobMethods;
    let supportedMethods = paymobMethods.map((item) => item.key);
    let defaultMethod =
      this.paymentRuntimeConfigService.getPaymobDefaultCheckoutMethod(context);
    let checkoutFlow = this.paymentRuntimeConfigService.getPaymobCheckoutFlow();
    let normalizedMethods: PaymentCapabilityMethodViewModel[] = paymobMethods;
    const provider = pricing.provider;

    if (provider === PaymentProvider.PAYMOB) {
      normalizedMethods = paymobMethods;
    } else {
      normalizedMethods = [
        {
          key: 'SAWIYAA_WALLET',
          type: 'INTERNAL_WALLET',
          label: 'Sawiyaa Wallet',
          enabled: true,
          description: 'Internal wallet payment within Sawiyaa balance.',
        },
      ];
      methods = normalizedMethods.map((item) => ({
        key: item.key,
        label: item.label,
        type: item.type,
        enabled: item.enabled,
      }));
      supportedMethods = normalizedMethods.map((item) => item.key);
      defaultMethod = 'SAWIYAA_WALLET';
      checkoutFlow = PaymobCheckoutFlow.INTENTION;
    }

    return {
      item: {
        provider,
        checkoutFlow,
        methods,
        supportedMethods,
        defaultMethod,
        currency: pricing.currencyCode,
        regionalPricingMode: pricing.regionalPricingMode,
        resolvedCountryIsoCode: pricing.resolvedCountryIsoCode,
        normalizedMethods,
        wallet: walletCapability,
      },
    };
  }
}
