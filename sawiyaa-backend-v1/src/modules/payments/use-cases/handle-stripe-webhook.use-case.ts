import { Injectable } from '@nestjs/common';
import {
  PaymentEventType,
  PaymentProvider,
  PaymentStatus,
} from '@prisma/client';
import { Prisma } from '@prisma/client';
import { AppLoggerService } from '@common/logging/app-logger.service';
import {
  SecurityAuditActorType as AuditActorType,
  SecurityAuditSource,
} from '@common/security-audit/security-audit.types';
import { PaymentRepository } from '../repositories/payment.repository';
import { PaymentProviderRegistryService } from '../services/payment-provider-registry.service';
import { ExpirePaymentUseCase } from './expire-payment.use-case';
import { MarkPaymentFailedUseCase } from './mark-payment-failed.use-case';
import { MarkPaymentSucceededUseCase } from './mark-payment-succeeded.use-case';
import { gatewayMoneyMatchesPayment } from '../utils/money-units.util';

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

    const duplicate = await this.paymentRepository.findWebhookReceipt(
      PaymentProvider.STRIPE,
      webhook.providerEventRef,
    );

    if (duplicate) {
      const duplicatePayment = await this.paymentRepository.findById(
        duplicate.paymentId,
      );
      if (
        webhook.outcome === 'SUCCEEDED' &&
        duplicatePayment?.status === PaymentStatus.CAPTURED
      ) {
        await this.markPaymentSucceededUseCase.execute({
          paymentId: duplicate.paymentId,
          providerEventRef: webhook.providerEventRef,
          payload: webhook.payload,
        });
      }
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

    if (
      webhook.outcome === 'SUCCEEDED' &&
      !gatewayMoneyMatchesPayment({
        amountMinor: webhook.amountMinor,
        currencyCode: webhook.currencyCode,
        expectedAmount: payment.amountFromGateway,
        expectedCurrencyCode: payment.currencyCode,
      })
    ) {
      const receipt = await this.createReceiptOrFindDuplicate(
        payment.id,
        webhook.providerEventRef,
      );
      if (receipt.duplicate) {
        return {
          received: true,
          handled: true,
          paymentId: receipt.paymentId,
        };
      }
      await this.paymentRepository.createEvent({
        paymentId: payment.id,
        eventType: PaymentEventType.PROVIDER_WEBHOOK_RECEIVED,
        providerEventRef: webhook.providerEventRef,
        reason: 'FINANCIAL_MISMATCH_AMOUNT_OR_CURRENCY',
        payloadJson: webhook.payload as Prisma.InputJsonValue,
      });
      return { received: true, handled: false, paymentId: payment.id };
    }

    if (payment.status === targetStatus) {
      const receipt = await this.createReceiptOrFindDuplicate(
        payment.id,
        webhook.providerEventRef,
      );
      if (receipt.duplicate) {
        return {
          received: true,
          handled: true,
          paymentId: receipt.paymentId,
        };
      }
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

    if (
      payment.status === PaymentStatus.EXPIRED &&
      webhook.outcome === 'SUCCEEDED'
    ) {
      const receipt = await this.createReceiptOrFindDuplicate(
        payment.id,
        webhook.providerEventRef,
      );
      if (receipt.duplicate) {
        return {
          received: true,
          handled: true,
          paymentId: receipt.paymentId,
        };
      }
      await this.paymentRepository.createEvent({
        paymentId: payment.id,
        eventType: PaymentEventType.PAYMENT_LATE_SUCCESS_REVIEW_REQUIRED,
        actorType: AuditActorType.PAYMENT_WEBHOOK,
        source: SecurityAuditSource.PAYMENT_WEBHOOK,
        providerEventRef: webhook.providerEventRef,
        reason: 'PAYMENT_SUCCESS_RECEIVED_AFTER_EXPIRY',
        payloadJson: webhook.payload as Prisma.InputJsonValue,
      });
      return {
        received: true,
        handled: false,
        paymentId: payment.id,
      };
    }

    try {
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
    } catch (error) {
      if (this.isWebhookReceiptConflict(error)) {
        const receipt = await this.paymentRepository.findWebhookReceipt(
          PaymentProvider.STRIPE,
          webhook.providerEventRef,
        );
        return {
          received: true,
          handled: true,
          paymentId: receipt?.paymentId ?? payment.id,
        };
      }
      throw error;
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

  private isWebhookReceiptConflict(error: unknown): boolean {
    if ((error as { code?: string } | null)?.code !== 'P2002') {
      return false;
    }

    const target = (error as { meta?: { target?: unknown } } | null)?.meta
      ?.target;
    return Array.isArray(target)
      ? target.some((value) => value === 'providerEventRef')
      : true;
  }

  private async createReceiptOrFindDuplicate(
    paymentId: string,
    providerEventRef: string,
  ): Promise<{ duplicate: boolean; paymentId: string }> {
    try {
      await this.paymentRepository.createWebhookReceipt({
        provider: PaymentProvider.STRIPE,
        providerEventRef,
        paymentId,
      });
      return { duplicate: false, paymentId };
    } catch (error) {
      if (!this.isWebhookReceiptConflict(error)) {
        throw error;
      }

      const receipt = await this.paymentRepository.findWebhookReceipt(
        PaymentProvider.STRIPE,
        providerEventRef,
      );
      return {
        duplicate: true,
        paymentId: receipt?.paymentId ?? paymentId,
      };
    }
  }
}
