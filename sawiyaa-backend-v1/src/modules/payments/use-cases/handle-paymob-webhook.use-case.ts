import { Injectable } from '@nestjs/common';
import {
  PaymentEventType,
  PaymentProvider,
  PaymentStatus,
  Prisma,
} from '@prisma/client';
import { AppLoggerService } from '@common/logging/app-logger.service';
import { PaymentRepository } from '../repositories/payment.repository';
import { PaymentProviderRegistryService } from '../services/payment-provider-registry.service';
import { ExpirePaymentUseCase } from './expire-payment.use-case';
import { MarkPaymentFailedUseCase } from './mark-payment-failed.use-case';
import { MarkPaymentSucceededUseCase } from './mark-payment-succeeded.use-case';
import { gatewayMoneyMatchesPayment } from '../utils/money-units.util';

@Injectable()
export class HandlePaymobWebhookUseCase {
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
    this.logWebhookShape(input);

    const adapter = this.paymentProviderRegistryService.get(
      PaymentProvider.PAYMOB,
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
      PaymentProvider.PAYMOB,
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
      PaymentProvider.PAYMOB,
      webhook.providerPaymentRef,
    );

    if (!payment) {
      this.logger.warn(
        {
          message: 'Paymob webhook received for unknown payment reference',
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
        expectedAmount: payment.amountTotal,
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
      if (!receipt.duplicate) {
        await this.paymentRepository.createEvent({
          paymentId: payment.id,
          eventType: PaymentEventType.PROVIDER_WEBHOOK_RECEIVED,
          providerEventRef: webhook.providerEventRef,
          reason: 'PAYMENT_SUCCESS_RECEIVED_AFTER_EXPIRY',
          payloadJson: webhook.payload as Prisma.InputJsonValue,
        });
      }
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
          PaymentProvider.PAYMOB,
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
        provider: PaymentProvider.PAYMOB,
        providerEventRef,
        paymentId,
      });
      return { duplicate: false, paymentId };
    } catch (error) {
      if (!this.isWebhookReceiptConflict(error)) {
        throw error;
      }

      const receipt = await this.paymentRepository.findWebhookReceipt(
        PaymentProvider.PAYMOB,
        providerEventRef,
      );
      return {
        duplicate: true,
        paymentId: receipt?.paymentId ?? paymentId,
      };
    }
  }

  private logWebhookShape(input: {
    rawBody: Buffer;
    headers: Record<string, string | string[] | undefined>;
    query?: Record<string, unknown>;
  }): void {
    let body: unknown;
    try {
      body = JSON.parse(input.rawBody.toString('utf8')) as unknown;
    } catch {
      this.logger.debug(
        { message: 'Paymob webhook received with invalid JSON shape' },
        'Payments',
      );
      return;
    }

    const record =
      body && typeof body === 'object' && !Array.isArray(body)
        ? (body as Record<string, unknown>)
        : {};
    const transaction =
      record.obj && typeof record.obj === 'object' && !Array.isArray(record.obj)
        ? (record.obj as Record<string, unknown>)
        : record;
    const hmacHeader = ['x-paymob-hmac', 'hmac', 'x-hmac'].some((key) => {
      const value = input.headers[key];
      return Array.isArray(value) ? Boolean(value[0]?.trim()) : Boolean(value?.trim());
    });
    const hmacQuery = typeof input.query?.hmac === 'string' && Boolean(input.query.hmac.trim());

    this.logger.debug(
      {
        message: 'Paymob webhook shape received',
        hasObj: Boolean(record.obj),
        type: typeof record.type === 'string' ? record.type : null,
        hasHmac: hmacHeader || hmacQuery,
        transactionId:
          typeof transaction.id === 'string' || typeof transaction.id === 'number'
            ? String(transaction.id)
            : null,
      },
      'Payments',
    );
  }
}
