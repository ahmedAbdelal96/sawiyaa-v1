import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  PaymentEventType,
  PaymentProvider,
  RefundDestination,
  PaymentStatus,
  Prisma,
  RefundStatus,
  RefundType,
} from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { AppLoggerService } from '@common/logging/app-logger.service';
import { PostRefundLedgerEntriesUseCase } from '@modules/financial-operations/use-cases/post-refund-ledger-entries.use-case';
import { OperationalNotificationService } from '@modules/notifications/services/operational-notification.service';
import { CustomerWalletAccountingService } from '@modules/customer-wallets/services/customer-wallet-accounting.service';
import { PaymentMapper } from '../mappers/payment.mapper';
import { PaymentRepository } from '../repositories/payment.repository';
import { OrchestrateSessionPaymentStatusService } from '../services/orchestrate-session-payment-status.service';
import { PaymentProviderRegistryService } from '../services/payment-provider-registry.service';
import { ValidatePaymentStatusTransitionService } from '../services/validate-payment-status-transition.service';
import { ValidateRefundEligibilityService } from '../services/validate-refund-eligibility.service';

@Injectable()
export class RequestPaymentRefundUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentRepository: PaymentRepository,
    private readonly paymentProviderRegistryService: PaymentProviderRegistryService,
    private readonly validatePaymentStatusTransitionService: ValidatePaymentStatusTransitionService,
    private readonly validateRefundEligibilityService: ValidateRefundEligibilityService,
    private readonly postRefundLedgerEntriesUseCase: PostRefundLedgerEntriesUseCase,
    private readonly customerWalletAccountingService: CustomerWalletAccountingService,
    private readonly orchestrateSessionPaymentStatusService: OrchestrateSessionPaymentStatusService,
    private readonly operationalNotificationService: OperationalNotificationService,
    private readonly paymentMapper: PaymentMapper,
    private readonly logger: AppLoggerService,
  ) {}

  async execute(input: {
    paymentId: string;
    actorUserId: string;
    amount?: string | null;
    reason?: string | null;
    destination?: RefundDestination;
    retryRefundId?: string | null;
  }) {
    const payment = await this.paymentRepository.findById(input.paymentId);

    if (!payment) {
      throw new NotFoundException({
        messageKey: 'payments.errors.paymentNotFound',
        error: 'PAYMENT_NOT_FOUND',
      });
    }

    this.validateRefundEligibilityService.assertPaymentRefundable(
      payment.status,
    );

    if (
      input.destination === RefundDestination.ORIGINAL_METHOD &&
      payment.amountFromWallet.gt(0)
    ) {
      throw new BadRequestException({
        messageKey:
          'payments.errors.originalMethodRefundNotAllowedForWalletSplit',
        error: 'PAYMENT_ORIGINAL_METHOD_REFUND_NOT_ALLOWED_FOR_WALLET_SPLIT',
      });
    }

    if (!input.retryRefundId) {
      const activeRefund =
        await this.paymentRepository.findActiveRefundByPaymentId(payment.id);
      this.validateRefundEligibilityService.assertNoActiveRefund(activeRefund);
    }

    const aggregate =
      await this.paymentRepository.sumSucceededRefundAmountByPaymentId(
        payment.id,
      );
    const alreadyRefunded = aggregate._sum.amount ?? new Prisma.Decimal(0);
    const resolvedAmount =
      this.validateRefundEligibilityService.resolveRefundAmount({
        paymentAmountTotal: payment.amountTotal,
        alreadyRefundedAmount: alreadyRefunded,
        requestedAmount: input.amount ?? null,
      });

    const refund = await this.prisma.$transaction(async (tx) => {
      let created;
      if (input.retryRefundId) {
        const existing = await this.paymentRepository.findRefundById(
          input.retryRefundId,
        );
        if (!existing || existing.paymentId !== payment.id) {
          throw new NotFoundException({
            messageKey: 'payments.errors.refundNotFound',
            error: 'PAYMENT_REFUND_NOT_FOUND',
          });
        }

        this.validateRefundEligibilityService.assertRetryableRefundStatus(
          existing.status,
        );
        created = await this.paymentRepository.updateRefund(
          existing.id,
          {
            status: RefundStatus.REQUESTED,
            failedAt: null,
            processedAt: null,
            refundReason: input.reason ?? existing.refundReason ?? null,
            providerRefundRef: null,
            destination: input.destination ?? existing.destination,
            metadataJson: {
              ...((existing.metadataJson as Record<string, unknown> | null) ??
                {}),
              source: 'manual-refund-request',
              actorUserId: input.actorUserId,
              requestedDestination: input.destination ?? existing.destination,
              retryOfRefundId: existing.id,
            },
          },
          tx,
        );
      } else {
        created = await this.paymentRepository.createRefund(
          {
            paymentId: payment.id,
            sessionId: payment.sessionId ?? null,
            refundType: resolvedAmount.isFullRefund
              ? RefundType.FULL
              : RefundType.PARTIAL,
            status: RefundStatus.REQUESTED,
            destination: input.destination ?? RefundDestination.CUSTOMER_WALLET,
            refundReason: input.reason ?? null,
            amount: resolvedAmount.amount.toFixed(2),
            currencyCode: payment.currencyCode,
            metadataJson: {
              source: 'manual-refund-request',
              actorUserId: input.actorUserId,
              requestedDestination:
                input.destination ?? RefundDestination.CUSTOMER_WALLET,
              requestedAmount: resolvedAmount.amount.toFixed(2),
              alreadyRefundedAmount: alreadyRefunded.toFixed(2),
              paymentAmountTotal: payment.amountTotal.toFixed(2),
            },
          },
          tx,
        );
      }

      await this.paymentRepository.createEvent(
        {
          paymentId: payment.id,
          eventType: PaymentEventType.REFUND_REQUESTED,
          payloadJson: {
            refundId: created.id,
            amount: created.amount.toString(),
            currency: created.currencyCode,
            actorUserId: input.actorUserId,
          },
        },
        tx,
      );

      if (payment.status !== PaymentStatus.REFUND_PENDING) {
        this.validatePaymentStatusTransitionService.assertCanTransition(
          payment.status,
          PaymentStatus.REFUND_PENDING,
        );

        await this.paymentRepository.updateStatus(
          payment.id,
          {
            status: PaymentStatus.REFUND_PENDING,
          },
          tx,
        );
      }

      return created;
    });

    if (refund.destination === RefundDestination.CUSTOMER_WALLET) {
      const finalized = await this.finalizeWalletRefundOutcome({
        payment,
        refundId: refund.id,
      });

      this.logger.info(
        {
          message: 'Refund credited to customer wallet',
          paymentId: payment.id,
          refundId: refund.id,
          destination: refund.destination,
        },
        undefined,
        'Payments',
      );

      return {
        item: this.paymentMapper.toRefundViewModel(finalized),
      };
    }

    if (payment.patientId) {
      await this.operationalNotificationService.notifyRefundRequested({
        patientProfileId: payment.patientId,
        refundId: refund.id,
        amount: refund.amount.toString(),
        currencyCode: refund.currencyCode,
      });
    }

    if (payment.sessionId) {
      await this.orchestrateSessionPaymentStatusService.markSessionRefundPending(
        payment.sessionId,
      );
    }

    const providerAdapter = this.paymentProviderRegistryService.get(
      payment.provider,
    );
    const providerTransactionRef =
      payment.provider === PaymentProvider.PAYMOB
        ? await this.resolvePaymobTransactionRef(payment.id)
        : null;

    let providerResult: {
      providerRefundRef: string | null;
      outcome: 'SUCCEEDED' | 'PROCESSING' | 'FAILED';
      metadata?: Record<string, unknown>;
    } | null = null;

    try {
      providerResult = await providerAdapter.refundPayment({
        paymentId: payment.id,
        providerPaymentRef: payment.providerPaymentRef ?? null,
        providerOrderRef: payment.providerOrderRef ?? null,
        providerTransactionRef,
        amountMinor: this.toMinorUnits(refund.amount.toString()),
        currency: payment.currencyCode,
        reason: input.reason ?? null,
      });
    } catch {
      providerResult = {
        providerRefundRef: null,
        outcome: 'FAILED',
        metadata: {
          error: 'provider_refund_request_failed',
        },
      };
    }

    const finalized = await this.finalizeRefundOutcome({
      payment,
      refundId: refund.id,
      providerRefundRef: providerResult.providerRefundRef,
      providerOutcome: providerResult.outcome,
      providerPayload: providerResult.metadata ?? {},
    });

    this.logger.info(
      {
        message: 'Refund request processed',
        paymentId: payment.id,
        refundId: refund.id,
        provider: payment.provider,
        outcome: providerResult.outcome,
      },
      undefined,
      'Payments',
    );

    return {
      item: this.paymentMapper.toRefundViewModel(finalized),
    };
  }

  private async finalizeWalletRefundOutcome(input: {
    payment: {
      id: string;
      patientId: string | null;
      status: PaymentStatus;
      amountTotal: Prisma.Decimal;
      sessionId: string | null;
      currencyCode: string;
    };
    refundId: string;
  }) {
    const succeeded = await this.prisma.$transaction(async (tx) => {
      const updated = await this.paymentRepository.updateRefund(
        input.refundId,
        {
          status: RefundStatus.SUCCEEDED,
          processedAt: new Date(),
          providerRefundRef: null,
        },
        tx,
      );

      await this.paymentRepository.createEvent(
        {
          paymentId: input.payment.id,
          eventType: PaymentEventType.REFUND_PROCESSED,
          payloadJson: {
            refundId: input.refundId,
            outcome: 'SUCCEEDED_CUSTOMER_WALLET',
          },
        },
        tx,
      );

      return updated;
    });

    if (!input.payment.patientId) {
      throw new BadRequestException({
        messageKey: 'payments.errors.patientRequiredForWalletRefund',
        error: 'PAYMENT_PATIENT_REQUIRED_FOR_WALLET_REFUND',
      });
    }

    await this.customerWalletAccountingService.creditRefundToWallet({
      patientId: input.payment.patientId,
      paymentId: input.payment.id,
      refundId: succeeded.id,
      sessionId: input.payment.sessionId,
      currencyCode: succeeded.currencyCode,
      amount: succeeded.amount.toString(),
    });

    await this.paymentRepository.updateRefund(succeeded.id, {
      customerWalletCreditedAt: new Date(),
    });

    const aggregate =
      await this.paymentRepository.sumSucceededRefundAmountByPaymentId(
        input.payment.id,
      );
    const refunded = aggregate._sum.amount ?? new Prisma.Decimal(0);
    const isFullyRefunded = refunded.gte(input.payment.amountTotal);
    const targetStatus = isFullyRefunded
      ? PaymentStatus.REFUNDED
      : PaymentStatus.PARTIALLY_REFUNDED;

    this.validatePaymentStatusTransitionService.assertCanTransition(
      PaymentStatus.REFUND_PENDING,
      targetStatus,
    );

    await this.paymentRepository.updateStatus(input.payment.id, {
      status: targetStatus,
    });

    await this.postRefundLedgerEntriesUseCase.execute({
      refundId: succeeded.id,
    });

    if (input.payment.sessionId) {
      if (isFullyRefunded) {
        await this.orchestrateSessionPaymentStatusService.markSessionRefunded(
          input.payment.sessionId,
        );
      } else {
        await this.orchestrateSessionPaymentStatusService.markSessionRefundPending(
          input.payment.sessionId,
        );
      }
    }

    if (input.payment.patientId) {
      await this.operationalNotificationService.notifyRefundSucceeded({
        patientProfileId: input.payment.patientId,
        refundId: succeeded.id,
        amount: succeeded.amount.toString(),
        currencyCode: succeeded.currencyCode,
      });
    }

    const latest = await this.paymentRepository.findRefundById(succeeded.id);
    if (!latest) {
      throw new NotFoundException({
        messageKey: 'payments.errors.refundNotFound',
        error: 'PAYMENT_REFUND_NOT_FOUND',
      });
    }

    return latest;
  }

  private async finalizeRefundOutcome(input: {
    payment: {
      id: string;
      patientId: string | null;
      status: PaymentStatus;
      amountTotal: Prisma.Decimal;
      sessionId: string | null;
    };
    refundId: string;
    providerRefundRef: string | null;
    providerOutcome: 'SUCCEEDED' | 'PROCESSING' | 'FAILED';
    providerPayload: Record<string, unknown>;
  }) {
    if (input.providerOutcome === 'PROCESSING') {
      return this.paymentRepository.updateRefund(input.refundId, {
        status: RefundStatus.PROCESSING,
        providerRefundRef: input.providerRefundRef,
      });
    }

    if (input.providerOutcome === 'FAILED') {
      const failed = await this.paymentRepository.updateRefund(input.refundId, {
        status: RefundStatus.FAILED,
        providerRefundRef: input.providerRefundRef,
        failedAt: new Date(),
      });

      const aggregate =
        await this.paymentRepository.sumSucceededRefundAmountByPaymentId(
          input.payment.id,
        );
      const refunded = aggregate._sum.amount ?? new Prisma.Decimal(0);
      const targetStatus = refunded.gt(0)
        ? PaymentStatus.PARTIALLY_REFUNDED
        : PaymentStatus.CAPTURED;

      this.validatePaymentStatusTransitionService.assertCanTransition(
        PaymentStatus.REFUND_PENDING,
        targetStatus,
      );

      await this.paymentRepository.updateStatus(input.payment.id, {
        status: targetStatus,
      });

      if (input.payment.patientId) {
        await this.operationalNotificationService.notifyRefundFailed({
          patientProfileId: input.payment.patientId,
          refundId: failed.id,
        });
      }

      return failed;
    }

    const succeeded = await this.prisma.$transaction(async (tx) => {
      const updated = await this.paymentRepository.updateRefund(
        input.refundId,
        {
          status: RefundStatus.SUCCEEDED,
          providerRefundRef: input.providerRefundRef,
          processedAt: new Date(),
        },
        tx,
      );

      await this.paymentRepository.createEvent(
        {
          paymentId: input.payment.id,
          eventType: PaymentEventType.REFUND_PROCESSED,
          providerEventRef: input.providerRefundRef ?? null,
          payloadJson: {
            refundId: input.refundId,
            outcome: input.providerOutcome,
            ...input.providerPayload,
          },
        },
        tx,
      );

      return updated;
    });

    const aggregate =
      await this.paymentRepository.sumSucceededRefundAmountByPaymentId(
        input.payment.id,
      );
    const refunded = aggregate._sum.amount ?? new Prisma.Decimal(0);
    const isFullyRefunded = refunded.gte(input.payment.amountTotal);
    const targetStatus = isFullyRefunded
      ? PaymentStatus.REFUNDED
      : PaymentStatus.PARTIALLY_REFUNDED;

    this.validatePaymentStatusTransitionService.assertCanTransition(
      PaymentStatus.REFUND_PENDING,
      targetStatus,
    );

    await this.paymentRepository.updateStatus(input.payment.id, {
      status: targetStatus,
    });

    await this.postRefundLedgerEntriesUseCase.execute({
      refundId: succeeded.id,
    });

    if (input.payment.sessionId) {
      if (isFullyRefunded) {
        await this.orchestrateSessionPaymentStatusService.markSessionRefunded(
          input.payment.sessionId,
        );
      } else {
        await this.orchestrateSessionPaymentStatusService.markSessionRefundPending(
          input.payment.sessionId,
        );
      }
    }

    if (input.payment.patientId) {
      await this.operationalNotificationService.notifyRefundSucceeded({
        patientProfileId: input.payment.patientId,
        refundId: succeeded.id,
        amount: succeeded.amount.toString(),
        currencyCode: succeeded.currencyCode,
      });
    }

    return succeeded;
  }

  private async resolvePaymobTransactionRef(
    paymentId: string,
  ): Promise<string | null> {
    const event =
      await this.paymentRepository.findLatestProviderWebhookEventByPaymentId(
        paymentId,
      );

    if (!event?.payloadJson || typeof event.payloadJson !== 'object') {
      return null;
    }

    const payload = event.payloadJson as Record<string, unknown>;
    const transactionId = payload.id;

    if (!transactionId) {
      return null;
    }

    return String(transactionId);
  }

  private toMinorUnits(amount: string): number {
    return Math.round(Number(amount) * 100);
  }
}
