import { Injectable } from '@nestjs/common';
import {
  PaymentProvider,
  PaymentStatus,
  Prisma,
  RefundStatus,
} from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { toGatewayMinorUnits } from '../utils/money-units.util';
import { PaymentProviderRegistryService } from './payment-provider-registry.service';
import { MarkPaymentFailedUseCase } from '../use-cases/mark-payment-failed.use-case';
import { MarkPaymentSucceededUseCase } from '../use-cases/mark-payment-succeeded.use-case';
import { RequestPaymentRefundUseCase } from '../use-cases/request-payment-refund.use-case';

@Injectable()
export class PaymentProviderRecoveryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly registry: PaymentProviderRegistryService,
    private readonly markSucceeded: MarkPaymentSucceededUseCase,
    private readonly markFailed: MarkPaymentFailedUseCase,
    private readonly refunds: RequestPaymentRefundUseCase,
  ) {}

  async reconcileEligible(batchSize = 100) {
    const [payments, refunds] = await Promise.all([
      this.prisma.payment.findMany({
        where: {
          provider: { in: [PaymentProvider.STRIPE, PaymentProvider.PAYMOB] },
          status: {
            in: [
              PaymentStatus.CREATED,
              PaymentStatus.PENDING,
              PaymentStatus.REQUIRES_ACTION,
              PaymentStatus.AUTHORIZED,
            ],
          },
        },
        orderBy: { updatedAt: 'asc' },
        take: batchSize,
        select: { id: true },
      }),
      this.prisma.refund.findMany({
        where: { status: RefundStatus.PROCESSING },
        orderBy: { updatedAt: 'asc' },
        take: batchSize,
        select: { id: true },
      }),
    ]);

    let paymentCount = 0;
    for (const payment of payments) {
      await this.reconcilePayment(payment.id, false);
      paymentCount += 1;
    }
    let refundCount = 0;
    for (const refund of refunds) {
      await this.refunds.reconcileProviderRefund(refund.id);
      refundCount += 1;
    }
    return { payments: paymentCount, refunds: refundCount };
  }

  async reconcilePayment(paymentId: string, allowStripeReplay: boolean) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        session: { select: { id: true } },
        patient: {
          select: {
            user: { select: { emails: { take: 1, select: { email: true } } } },
          },
        },
      },
    });
    if (!payment || payment.provider === PaymentProvider.INTERNAL_WALLET)
      return payment;

    const adapter = this.registry.get(payment.provider, {
      currencyCode: payment.currencyCode,
    });
    const expectedAmountMinor = toGatewayMinorUnits(
      payment.amountFromGateway,
      payment.currencyCode,
    );
    let result = await adapter.reconcilePayment({
      paymentId: payment.id,
      providerPaymentRef: payment.providerPaymentRef,
      providerOrderRef: payment.providerOrderRef,
      amountMinor: expectedAmountMinor,
      currency: payment.currencyCode,
    });

    // Stripe guarantees that replaying the same POST with the same key returns
    // the original operation. Limit replay to the documented key-retention window.
    if (
      allowStripeReplay &&
      payment.provider === PaymentProvider.STRIPE &&
      payment.status === PaymentStatus.CREATED &&
      !payment.providerPaymentRef &&
      result.outcome === 'NOT_FOUND' &&
      Date.now() - payment.createdAt.getTime() < 23 * 60 * 60 * 1000
    ) {
      const resumed = await adapter.initiateSessionPayment({
        paymentId: payment.id,
        amountMinor: expectedAmountMinor,
        currency: payment.currencyCode,
        description: `Session payment ${payment.sessionId ?? payment.id}`,
        sessionId: payment.sessionId ?? payment.id,
        patientEmail: payment.patient?.user.emails[0]?.email ?? null,
      });
      result = {
        outcome:
          resumed.status === PaymentStatus.CAPTURED
            ? 'SUCCEEDED'
            : resumed.status === PaymentStatus.AUTHORIZED
              ? 'AUTHORIZED'
              : 'PROCESSING',
        providerPaymentRef: resumed.providerPaymentRef,
        providerOrderRef: resumed.providerOrderRef,
        amountMinor: expectedAmountMinor,
        currencyCode: payment.currencyCode,
        clientSecret: resumed.clientSecret,
        checkoutUrl: resumed.checkoutUrl,
        evidence: { source: 'stripe-idempotent-initiation-replay' },
      };
    }

    const amountMatches =
      result.amountMinor == null || result.amountMinor === expectedAmountMinor;
    const currencyMatches =
      result.currencyCode == null ||
      result.currencyCode.toUpperCase() === payment.currencyCode.toUpperCase();
    const trustedOutcome =
      amountMatches && currencyMatches ? result.outcome : 'UNKNOWN';
    const metadata =
      (payment.metadataJson as Record<string, unknown> | null) ?? {};
    const previous =
      (metadata.providerReconciliation as
        | Record<string, unknown>
        | undefined) ?? {};

    await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${payment.id})::bigint)`;
      const current = await tx.payment.findUniqueOrThrow({
        where: { id: payment.id },
      });
      const nextStatus =
        trustedOutcome === 'AUTHORIZED'
          ? PaymentStatus.AUTHORIZED
          : trustedOutcome === 'PROCESSING' &&
              current.status === PaymentStatus.CREATED
            ? PaymentStatus.PENDING
            : current.status;
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: nextStatus,
          providerPaymentRef:
            result.providerPaymentRef ?? current.providerPaymentRef,
          providerOrderRef: result.providerOrderRef ?? current.providerOrderRef,
          metadataJson: {
            ...metadata,
            clientSecret: result.clientSecret ?? metadata.clientSecret ?? null,
            checkoutUrl: result.checkoutUrl ?? metadata.checkoutUrl ?? null,
            providerReconciliation: {
              attempts: Number(previous.attempts ?? 0) + 1,
              lastAttemptAt: new Date().toISOString(),
              outcome: trustedOutcome,
              amountMatches,
              currencyMatches,
              evidence: result.evidence,
            },
          } as Prisma.InputJsonValue,
        },
      });
    });

    const eventRef = `reconciliation:${payment.provider}:${result.providerPaymentRef ?? payment.id}:${trustedOutcome}`;
    if (trustedOutcome === 'SUCCEEDED') {
      return this.markSucceeded.execute({
        paymentId: payment.id,
        providerEventRef: eventRef,
        payload: {
          source: 'provider-reconciliation',
          evidence: result.evidence,
        },
      });
    }
    if (trustedOutcome === 'FAILED') {
      return this.markFailed.execute({
        paymentId: payment.id,
        providerEventRef: eventRef,
        payload: {
          source: 'provider-reconciliation',
          evidence: result.evidence,
        },
      });
    }
    return this.prisma.payment.findUnique({ where: { id: payment.id } });
  }
}
