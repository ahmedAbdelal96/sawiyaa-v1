import { Injectable, NotFoundException } from '@nestjs/common';
import { PaymentProvider } from '@prisma/client';
import { PaymentSessionRepository } from '../repositories/payment-session.repository';
import { PaymentRuntimeConfigService } from '../services/payment-runtime-config.service';

@Injectable()
export class GetPatientSessionPaymentCapabilitiesUseCase {
  constructor(
    private readonly paymentSessionRepository: PaymentSessionRepository,
    private readonly paymentRuntimeConfigService: PaymentRuntimeConfigService,
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

    const context = {
      checkoutCountryIsoCode: session.patient.country?.isoCode ?? null,
      operatingCountryIsoCode: session.practitioner.country?.isoCode ?? null,
    };
    const supportedMethods = this.paymentRuntimeConfigService
      .getPaymobEnabledMethods(context)
      .map((item) => item.key);
    const methods = this.paymentRuntimeConfigService
      .getPaymobEnabledMethods(context)
      .map((item) => ({
        key: item.key,
        label: item.label,
        type: item.type,
        enabled: item.enabled,
      }));

    return {
      item: {
        provider: PaymentProvider.PAYMOB,
        checkoutFlow: this.paymentRuntimeConfigService.getPaymobCheckoutFlow(),
        methods,
        supportedMethods,
        defaultMethod:
          this.paymentRuntimeConfigService.getPaymobDefaultCheckoutMethod(
            context,
          ),
      },
    };
  }
}
