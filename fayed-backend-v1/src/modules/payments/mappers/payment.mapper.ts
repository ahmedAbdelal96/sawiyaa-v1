import { Injectable } from '@nestjs/common';
import { Payment, Refund, RefundStatus } from '@prisma/client';
import {
  AdminPaymentOpsViewModel,
  PaymentViewModel,
  RefundViewModel,
} from '../types/payments.types';

type PaymentWithRefunds = Payment & {
  refunds?: Array<Pick<Refund, 'processedAt'>>;
};

@Injectable()
export class PaymentMapper {
  toViewModel(payment: PaymentWithRefunds): PaymentViewModel {
    const metadata = (payment.metadataJson ?? {}) as Record<string, unknown>;
    const refundedAt =
      payment.refunds?.find((refund) => refund.processedAt)?.processedAt ?? null;

    return {
      id: payment.id,
      sessionId: payment.sessionId ?? null,
      provider: payment.provider,
      status: payment.status,
      amount: payment.amountTotal.toString(),
      currency: payment.currencyCode,
      providerPaymentId: payment.providerPaymentRef ?? null,
      providerReference: payment.providerOrderRef ?? null,
      checkoutUrl:
        typeof metadata.checkoutUrl === 'string' ? metadata.checkoutUrl : null,
      clientSecret:
        typeof metadata.clientSecret === 'string' ? metadata.clientSecret : null,
      paidAt: payment.capturedAt?.toISOString() ?? null,
      failedAt: payment.failedAt?.toISOString() ?? null,
      expiredAt: payment.expiredAt?.toISOString() ?? null,
      refundedAt: refundedAt?.toISOString() ?? null,
      createdAt: payment.createdAt.toISOString(),
    };
  }

  toRefundViewModel(refund: Refund): RefundViewModel {
    return {
      id: refund.id,
      paymentId: refund.paymentId,
      sessionId: refund.sessionId ?? null,
      refundType: refund.refundType,
      status: refund.status,
      amount: refund.amount.toString(),
      currency: refund.currencyCode,
      reason: refund.refundReason ?? null,
      providerRefundRef: refund.providerRefundRef ?? null,
      requestedAt: refund.requestedAt.toISOString(),
      processedAt: refund.processedAt?.toISOString() ?? null,
      failedAt: refund.failedAt?.toISOString() ?? null,
      createdAt: refund.createdAt.toISOString(),
    };
  }

  toAdminOpsViewModel(payment: {
    id: string;
    paymentPurpose: string;
    provider: Payment['provider'];
    status: Payment['status'];
    amountSubtotal: Payment['amountSubtotal'];
    amountDiscount: Payment['amountDiscount'];
    amountTotal: Payment['amountTotal'];
    currencyCode: string;
    providerPaymentRef: string | null;
    providerOrderRef: string | null;
    createdAt: Date;
    initiatedAt: Date;
    capturedAt: Date | null;
    failedAt: Date | null;
    expiredAt: Date | null;
    session: {
      id: string;
      status: string;
      sessionMode: string;
      scheduledStartAt: Date | null;
      scheduledEndAt: Date | null;
      provider: string;
      providerRoomId: string | null;
      providerSessionRef: string | null;
    } | null;
    refunds: Refund[];
    events: Array<{
      id: string;
      eventType: string;
      providerEventRef: string | null;
      createdAt: Date;
    }>;
  }): AdminPaymentOpsViewModel {
    const refunds = payment.refunds.map((refund) => this.toRefundViewModel(refund));
    const totalRefundedAmount = payment.refunds
      .filter((refund) => refund.status === RefundStatus.SUCCEEDED)
      .reduce((sum, refund) => sum + Number(refund.amount.toString()), 0);

    return {
      payment: {
        id: payment.id,
        purpose: payment.paymentPurpose,
        provider: payment.provider,
        status: payment.status,
        amountSubtotal: payment.amountSubtotal.toString(),
        amountDiscount: payment.amountDiscount.toString(),
        amountTotal: payment.amountTotal.toString(),
        currency: payment.currencyCode,
        providerPaymentId: payment.providerPaymentRef ?? null,
        providerReference: payment.providerOrderRef ?? null,
        createdAt: payment.createdAt.toISOString(),
        initiatedAt: payment.initiatedAt.toISOString(),
        capturedAt: payment.capturedAt?.toISOString() ?? null,
        failedAt: payment.failedAt?.toISOString() ?? null,
        expiredAt: payment.expiredAt?.toISOString() ?? null,
      },
      session: payment.session
        ? {
            id: payment.session.id,
            status: payment.session.status,
            sessionMode: payment.session.sessionMode,
            scheduledStartAt: payment.session.scheduledStartAt?.toISOString() ?? null,
            scheduledEndAt: payment.session.scheduledEndAt?.toISOString() ?? null,
            provider: payment.session.provider,
            providerRoomId: payment.session.providerRoomId,
            providerSessionRef: payment.session.providerSessionRef,
          }
        : null,
      refundSummary: {
        totalCount: payment.refunds.length,
        requestedCount: payment.refunds.filter((item) => item.status === RefundStatus.REQUESTED).length,
        processingCount: payment.refunds.filter((item) => item.status === RefundStatus.PROCESSING).length,
        succeededCount: payment.refunds.filter((item) => item.status === RefundStatus.SUCCEEDED).length,
        failedCount: payment.refunds.filter((item) => item.status === RefundStatus.FAILED).length,
        cancelledCount: payment.refunds.filter((item) => item.status === RefundStatus.CANCELLED).length,
        totalRefundedAmount: totalRefundedAmount.toFixed(2),
        lastRefundAt: payment.refunds[0]?.requestedAt?.toISOString() ?? null,
      },
      refunds,
      recentEvents: payment.events.map((event) => ({
        id: event.id,
        eventType: event.eventType,
        providerEventRef: event.providerEventRef ?? null,
        createdAt: event.createdAt.toISOString(),
      })),
    };
  }
}
