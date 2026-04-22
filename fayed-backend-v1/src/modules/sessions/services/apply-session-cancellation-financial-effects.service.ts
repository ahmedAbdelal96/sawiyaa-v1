import { ConflictException, Injectable } from '@nestjs/common';
import {
  PaymentEventType,
  PaymentStatus,
  Prisma,
  RefundDestination,
  RefundStatus,
  RefundType,
  Session,
  SessionCancellationRefundMode,
} from '@prisma/client';
import { CustomerWalletAccountingService } from '@modules/customer-wallets/services/customer-wallet-accounting.service';
import { PostRefundLedgerEntriesUseCase } from '@modules/financial-operations/use-cases/post-refund-ledger-entries.use-case';
import { SessionCancellationEvaluation } from './evaluate-session-cancellation-policy.service';

type CancellationFinancialEffect = {
  cancelledPaymentId: string | null;
  generatedRefundId: string | null;
  refundAmount: string;
  actions: Record<string, unknown>;
};

@Injectable()
export class ApplySessionCancellationFinancialEffectsService {
  constructor(
    private readonly customerWalletAccountingService: CustomerWalletAccountingService,
    private readonly postRefundLedgerEntriesUseCase: PostRefundLedgerEntriesUseCase,
  ) {}

  async apply(input: {
    tx: Prisma.TransactionClient;
    session: Pick<Session, 'id' | 'patientId' | 'scheduledStartAt'>;
    evaluation: SessionCancellationEvaluation;
    cancellationReason?: string | null;
  }): Promise<CancellationFinancialEffect> {
    const payment = await input.tx.payment.findFirst({
      where: { sessionId: input.session.id },
      orderBy: [{ createdAt: 'desc' }],
    });

    if (!payment) {
      return {
        cancelledPaymentId: null,
        generatedRefundId: null,
        refundAmount: '0.00',
        actions: { paymentFound: false },
      };
    }

    if (
      payment.status === PaymentStatus.CREATED ||
      payment.status === PaymentStatus.PENDING ||
      payment.status === PaymentStatus.REQUIRES_ACTION ||
      payment.status === PaymentStatus.AUTHORIZED
    ) {
      if (payment.amountFromWallet.gt(0)) {
        await this.customerWalletAccountingService.releaseReservationForPayment(
          {
            paymentId: payment.id,
            currencyCode: payment.currencyCode,
            releaseReason: 'PAYMENT_CANCELLED',
            tx: input.tx,
          },
        );
      }

      await input.tx.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.CANCELLED,
        },
      });

      await input.tx.paymentEvent.create({
        data: {
          paymentId: payment.id,
          eventType: PaymentEventType.PAYMENT_CANCELLED,
          payloadJson: {
            source: 'session-cancellation-policy',
            reason: input.cancellationReason ?? null,
          },
        },
      });

      return {
        cancelledPaymentId: payment.id,
        generatedRefundId: null,
        refundAmount: '0.00',
        actions: {
          paymentFound: true,
          paymentTransition: 'CANCELLED',
          reservationReleased: payment.amountFromWallet.gt(0),
        },
      };
    }

    if (
      payment.status !== PaymentStatus.CAPTURED &&
      payment.status !== PaymentStatus.PARTIALLY_REFUNDED &&
      payment.status !== PaymentStatus.REFUND_PENDING
    ) {
      return {
        cancelledPaymentId: payment.id,
        generatedRefundId: null,
        refundAmount: '0.00',
        actions: {
          paymentFound: true,
          paymentStatus: payment.status,
          refundHandled: false,
        },
      };
    }

    const refundableAmount = await this.resolveRefundAmount({
      tx: input.tx,
      paymentId: payment.id,
      paymentAmountTotal: payment.amountTotal,
      refundMode: input.evaluation.refundMode,
      refundPercent: input.evaluation.refundPercent,
    });

    if (refundableAmount.lte(0)) {
      return {
        cancelledPaymentId: payment.id,
        generatedRefundId: null,
        refundAmount: '0.00',
        actions: {
          paymentFound: true,
          paymentStatus: payment.status,
          refundHandled: false,
          reason: 'no-refund-due',
        },
      };
    }

    if (
      input.evaluation.refundDestination !== RefundDestination.CUSTOMER_WALLET
    ) {
      throw new ConflictException({
        messageKey:
          'sessions.errors.cancellationOriginalMethodRefundNotSupported',
        error: 'SESSION_CANCELLATION_REFUND_DESTINATION_NOT_SUPPORTED',
      });
    }

    const refund = await input.tx.refund.create({
      data: {
        paymentId: payment.id,
        sessionId: input.session.id,
        refundType: refundableAmount.gte(payment.amountTotal)
          ? RefundType.FULL
          : RefundType.PARTIAL,
        destination: RefundDestination.CUSTOMER_WALLET,
        status: RefundStatus.SUCCEEDED,
        amount: refundableAmount.toFixed(2),
        currencyCode: payment.currencyCode,
        refundReason:
          input.cancellationReason ??
          'Session cancelled based on active cancellation policy.',
        metadataJson: {
          source: 'session-cancellation-policy',
          policyRecordId: input.evaluation.policyId,
          policy: {
            id: input.evaluation.policyId,
            version: input.evaluation.policyVersion,
            bookingType: input.evaluation.bookingType,
            defaultRefundDestination:
              input.evaluation.policyDefaultRefundDestination,
          },
          rule: {
            id: input.evaluation.ruleId,
            code: input.evaluation.ruleCode,
            displayName: input.evaluation.ruleDisplayName,
            cancellationAllowed: input.evaluation.cancellationAllowed,
          },
          financialAllocation: {
            refundMode: input.evaluation.refundMode,
            refundPercent: input.evaluation.refundPercent,
            refundDestination: input.evaluation.refundDestination,
            refundAmount: refundableAmount.toFixed(2),
            hoursBeforeStart: Number(
              input.evaluation.hoursBeforeStart.toFixed(2),
            ),
          },
        },
        processedAt: new Date(),
      },
    });

    await input.tx.paymentEvent.create({
      data: {
        paymentId: payment.id,
        eventType: PaymentEventType.REFUND_PROCESSED,
        payloadJson: {
          source: 'session-cancellation-policy',
          refundId: refund.id,
          amount: refund.amount.toString(),
          destination: RefundDestination.CUSTOMER_WALLET,
        },
      },
    });

    await this.customerWalletAccountingService.creditRefundToWallet({
      patientId: payment.patientId,
      paymentId: payment.id,
      refundId: refund.id,
      sessionId: input.session.id,
      currencyCode: payment.currencyCode,
      amount: refund.amount.toString(),
      tx: input.tx,
    });

    await input.tx.refund.update({
      where: { id: refund.id },
      data: {
        customerWalletCreditedAt: new Date(),
      },
    });

    const aggregate = await input.tx.refund.aggregate({
      where: {
        paymentId: payment.id,
        status: RefundStatus.SUCCEEDED,
      },
      _sum: { amount: true },
    });

    const refundedAmount = aggregate._sum.amount ?? new Prisma.Decimal(0);
    const nextPaymentStatus = refundedAmount.gte(payment.amountTotal)
      ? PaymentStatus.REFUNDED
      : PaymentStatus.PARTIALLY_REFUNDED;

    await input.tx.payment.update({
      where: { id: payment.id },
      data: {
        status: nextPaymentStatus,
      },
    });

    return {
      cancelledPaymentId: payment.id,
      generatedRefundId: refund.id,
      refundAmount: refund.amount.toString(),
      actions: {
        paymentFound: true,
        paymentStatusBeforeCancellation: payment.status,
        paymentStatusAfterCancellation: nextPaymentStatus,
        refundHandled: true,
        refundDestination: RefundDestination.CUSTOMER_WALLET,
      },
    };
  }

  async postRefundLedgerIfNeeded(refundId: string | null) {
    if (!refundId) {
      return;
    }
    await this.postRefundLedgerEntriesUseCase.execute({ refundId });
  }

  private async resolveRefundAmount(input: {
    tx: Prisma.TransactionClient;
    paymentId: string;
    paymentAmountTotal: Prisma.Decimal;
    refundMode: SessionCancellationRefundMode;
    refundPercent: string | null;
  }): Promise<Prisma.Decimal> {
    if (input.refundMode === SessionCancellationRefundMode.NONE) {
      return new Prisma.Decimal(0);
    }

    const percent = new Prisma.Decimal(input.refundPercent ?? '0');
    if (percent.lte(0)) {
      return new Prisma.Decimal(0);
    }

    const targetRefundFromPolicy = input.paymentAmountTotal
      .mul(percent)
      .div(100)
      .toDecimalPlaces(2);

    const aggregate = await input.tx.refund.aggregate({
      where: {
        paymentId: input.paymentId,
        status: RefundStatus.SUCCEEDED,
      },
      _sum: { amount: true },
    });

    const alreadyRefunded = aggregate._sum.amount ?? new Prisma.Decimal(0);
    const due = targetRefundFromPolicy.sub(alreadyRefunded).toDecimalPlaces(2);

    return due.gt(0) ? due : new Prisma.Decimal(0);
  }
}
