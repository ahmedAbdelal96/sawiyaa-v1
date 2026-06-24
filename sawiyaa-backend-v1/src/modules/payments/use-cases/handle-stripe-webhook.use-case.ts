import { Injectable } from '@nestjs/common';
import {
  PaymentEventType,
  PaymentProvider,
  PaymentStatus,
} from '@prisma/client';
import { Prisma } from '@prisma/client';
import { AppLoggerService } from '@common/logging/app-logger.service';
import { PaymentRepository } from '../repositories/payment.repository';
import { PaymentProviderRegistryService } from '../services/payment-provider-registry.service';
import { ExpirePaymentUseCase } from './expire-payment.use-case';
import { MarkPaymentFailedUseCase } from './mark-payment-failed.use-case';
import { MarkPaymentSucceededUseCase } from './mark-payment-succeeded.use-case';

@Injectable()
export class HandleStripeWebhookUseCase {
  constructor(
    private readonly paymentProviderRegistryService: PaymentProviderRegistryService,
    private readonly paymentRepository: PaymentRepository,
    private readonly markPaymentSucceededUseCase: MarkPaymentSucceededUseCase,
    private readonly markPaymentFailedUseCase: MarkPaymentFailedUseCase,
    private readonly expirePaymentUseCase: ExpirePaymentUseCase,
    private readonly logger: AppLoggerService,
  ) {}

  async execute(input: {
    rawBody: Buffer;
    headers: Record<string, string | string[] | undefined>;
    query?: Record<string, unknown>;
  }) {
    const adapter = this.paymentProviderRegistryService.get(
      PaymentProvider.STRIPE,
    );
    const webhook = adapter.parseAndVerifyWebhook(input);

    if (!webhook.handled) {
      return {
        received: true,
        handled: false,
        paymentId: null,
      };
    }

    const duplicate = await this.paymentRepository.findEventByProviderEventRef(
      webhook.providerEventRef,
    );

    if (duplicate) {
      return {
        received: true,
        handled: true,
        paymentId: duplicate.paymentId,
      };
    }

    const payment = await this.paymentRepository.findByProviderReference(
      PaymentProvider.STRIPE,
      webhook.providerPaymentRef,
    );

    if (!payment) {
      this.logger.warn(
        {
          message: 'Stripe webhook received for unknown payment reference',
          providerPaymentRef: webhook.providerPaymentRef,
          providerEventRef: webhook.providerEventRef,
        },
        'Payments',
      );

      return {
        received: true,
        handled: false,
        paymentId: null,
      };
    }

    const targetStatus = this.mapOutcomeToStatus(webhook.outcome);

    if (payment.status === targetStatus) {
      await this.paymentRepository.createEvent({
        paymentId: payment.id,
        eventType: PaymentEventType.PROVIDER_WEBHOOK_RECEIVED,
        providerEventRef: webhook.providerEventRef,
        payloadJson: webhook.payload as Prisma.InputJsonValue,
      });

      return {
        received: true,
        handled: true,
        paymentId: payment.id,
      };
    }

    switch (webhook.outcome) {
      case 'SUCCEEDED':
        await this.markPaymentSucceededUseCase.execute({
          paymentId: payment.id,
          providerEventRef: webhook.providerEventRef,
          payload: webhook.payload,
        });
        break;
      case 'EXPIRED':
        await this.expirePaymentUseCase.execute({
          paymentId: payment.id,
          providerEventRef: webhook.providerEventRef,
          payload: webhook.payload,
        });
        break;
      case 'FAILED':
      default:
        await this.markPaymentFailedUseCase.execute({
          paymentId: payment.id,
          providerEventRef: webhook.providerEventRef,
          payload: webhook.payload,
        });
        break;
    }

    return {
      received: true,
      handled: true,
      paymentId: payment.id,
    };
  }

  private mapOutcomeToStatus(
    outcome: 'SUCCEEDED' | 'FAILED' | 'EXPIRED',
  ): PaymentStatus {
    switch (outcome) {
      case 'SUCCEEDED':
        return PaymentStatus.CAPTURED;
      case 'EXPIRED':
        return PaymentStatus.EXPIRED;
      case 'FAILED':
      default:
        return PaymentStatus.FAILED;
    }
  }
}
