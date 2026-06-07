import { Injectable } from '@nestjs/common';
import { Payment, PaymentStatus, Prisma, Refund, RefundStatus, SessionStatus } from '@prisma/client';
import { PaymentRegionalPricingMode } from '@common/payments/payment-region.resolver';
import {
  AdminPaymentOpsViewModel,
  PaymentAction,
  PaymentActionReason,
  PaymentViewModel,
  RefundViewModel,
} from '../types/payments.types';

type PaymentWithRefundsAndSession = Payment & {
  refunds?: Array<Pick<Refund, 'processedAt'>>;
  session?: {
    id: string;
    status: SessionStatus;
    expiresAt: Date | null;
  } | null;
};

@Injectable()
export class PaymentMapper {
  private computePaymentAction(
    payment: PaymentWithRefundsAndSession,
  ): PaymentAction {
    const now = new Date();

    // ── A. Terminal/completed payment statuses ──────────────────────────
    switch (payment.status) {
      case PaymentStatus.CAPTURED:
        return { canPay: false, reason: 'COMPLETED' };
      case PaymentStatus.REFUNDED:
      case PaymentStatus.PARTIALLY_REFUNDED:
        return { canPay: false, reason: 'REFUNDED' };
      case PaymentStatus.FAILED:
        return { canPay: false, reason: 'FAILED' };
      case PaymentStatus.CANCELLED:
        return { canPay: false, reason: 'CANCELLED' };
      case PaymentStatus.EXPIRED:
        return { canPay: false, reason: 'SESSION_EXPIRED' };
      case PaymentStatus.REFUND_PENDING:
        return { canPay: false, reason: 'PROCESSING' };
    }

    // ── B. Session-dependent logic — always check session BEFORE payment status ──

    if (!payment.session) {
      // Payment has no session link — cannot be paid via session flow
      return { canPay: false, reason: 'UNAVAILABLE' };
    }

    const session = payment.session;

    // Session is expired
    if (session.status === SessionStatus.EXPIRED) {
      return {
        canPay: false,
        reason: 'SESSION_EXPIRED',
        sessionStatus: session.status,
        sessionExpiresAt: session.expiresAt?.toISOString() ?? null,
      };
    }

    // Session is not PENDING_PAYMENT — cannot be paid right now
    if (session.status !== SessionStatus.PENDING_PAYMENT) {
      return {
        canPay: false,
        reason: 'UNAVAILABLE',
        sessionStatus: session.status,
        sessionExpiresAt: session.expiresAt?.toISOString() ?? null,
      };
    }

    // ── C. session.status === PENDING_PAYMENT ────────────────────────────

    // Payment window has closed
    if (session.expiresAt && session.expiresAt < now) {
      return {
        canPay: false,
        reason: 'SESSION_EXPIRED',
        sessionStatus: session.status,
        sessionExpiresAt: session.expiresAt.toISOString(),
      };
    }

    // session is PENDING_PAYMENT and not expired — evaluate by payment status
    switch (payment.status) {
      case PaymentStatus.CREATED:
      case PaymentStatus.REQUIRES_ACTION:
        // Patient still needs to complete an action (hosted checkout, etc.)
        return {
          canPay: true,
          reason: 'PAYABLE',
          sessionStatus: session.status,
          sessionExpiresAt: session.expiresAt?.toISOString() ?? null,
        };
      case PaymentStatus.PENDING:
        // Provider has not yet confirmed — waiting on provider side
        return {
          canPay: false,
          reason: 'PROCESSING',
          sessionStatus: session.status,
          sessionExpiresAt: session.expiresAt?.toISOString() ?? null,
        };
      case PaymentStatus.AUTHORIZED:
        // Auth holds exist — awaiting capture (should not reach here for new sessions,
        // but AUTHORIZED without capture means payment window is still valid)
        return {
          canPay: true,
          reason: 'PAYABLE',
          sessionStatus: session.status,
          sessionExpiresAt: session.expiresAt?.toISOString() ?? null,
        };
      default:
        return {
          canPay: false,
          reason: 'UNAVAILABLE',
          sessionStatus: session.status,
          sessionExpiresAt: session.expiresAt?.toISOString() ?? null,
        };
    }
  }

  toViewModel(payment: PaymentWithRefundsAndSession): PaymentViewModel {
    const metadata = (payment.metadataJson ?? {}) as Record<string, unknown>;
    const refundedAt =
      payment.refunds?.find((refund) => refund.processedAt)?.processedAt ??
      null;
    const regionalPricingMode =
      typeof metadata.regionalPricingMode === 'string' &&
      (metadata.regionalPricingMode === 'EGYPT_LOCAL' ||
        metadata.regionalPricingMode === 'INTERNATIONAL')
        ? (metadata.regionalPricingMode as PaymentRegionalPricingMode)
        : payment.currencyCode === 'EGP'
          ? 'EGYPT_LOCAL'
          : 'INTERNATIONAL';

    return {
      id: payment.id,
      sessionId: payment.sessionId ?? null,
      provider: payment.provider,
      status: payment.status,
      amountSubtotal: payment.amountSubtotal.toString(),
      amountDiscount: payment.amountDiscount.toString(),
      amountTotal: payment.amountTotal.toString(),
      amountFromWallet: payment.amountFromWallet.toString(),
      amountFromGateway: payment.amountFromGateway.toString(),
      amount: payment.amountTotal.toString(),
      currency: payment.currencyCode,
      regionalPricingMode,
      resolvedCountryIsoCode:
        typeof metadata.resolvedCountryIsoCode === 'string'
          ? metadata.resolvedCountryIsoCode
          : null,
      providerPaymentId: payment.providerPaymentRef ?? null,
      providerReference: payment.providerOrderRef ?? null,
      providerMethod:
        typeof metadata.paymobPaymentMethod === 'string'
          ? metadata.paymobPaymentMethod
          : typeof metadata.paymobCheckoutMethod === 'string'
            ? metadata.paymobCheckoutMethod
            : typeof metadata.providerMethod === 'string'
              ? metadata.providerMethod
              : null,
      checkoutUrl:
        typeof metadata.checkoutUrl === 'string' ? metadata.checkoutUrl : null,
      clientSecret:
        typeof metadata.clientSecret === 'string'
          ? metadata.clientSecret
          : null,
      paidAt: payment.capturedAt?.toISOString() ?? null,
      failedAt: payment.failedAt?.toISOString() ?? null,
      expiredAt: payment.expiredAt?.toISOString() ?? null,
      refundedAt: refundedAt?.toISOString() ?? null,
      createdAt: payment.createdAt.toISOString(),
      paymentAction: this.computePaymentAction(payment),
    };
  }

  toRefundViewModel(refund: Refund): RefundViewModel {
    return {
      id: refund.id,
      paymentId: refund.paymentId,
      sessionId: refund.sessionId ?? null,
      refundType: refund.refundType,
      destination: refund.destination,
      status: refund.status,
      amount: refund.amount.toString(),
      currency: refund.currencyCode,
      reason: refund.refundReason ?? null,
      providerRefundRef: refund.providerRefundRef ?? null,
      requestedAt: refund.requestedAt.toISOString(),
      processedAt: refund.processedAt?.toISOString() ?? null,
      failedAt: refund.failedAt?.toISOString() ?? null,
      customerWalletCreditedAt:
        refund.customerWalletCreditedAt?.toISOString() ?? null,
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
    amountFromWallet: Payment['amountFromWallet'];
    amountFromGateway: Payment['amountFromGateway'];
    currencyCode: string;
    providerPaymentRef: string | null;
    providerOrderRef: string | null;
    createdAt: Date;
    initiatedAt: Date;
    capturedAt: Date | null;
    failedAt: Date | null;
    expiredAt: Date | null;
    metadataJson?: Prisma.JsonValue | null;
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
    const metadata = (payment.metadataJson ?? {}) as Record<string, unknown>;
    const refunds = payment.refunds.map((refund) =>
      this.toRefundViewModel(refund),
    );
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
        amountFromWallet: payment.amountFromWallet.toString(),
        amountFromGateway: payment.amountFromGateway.toString(),
        currency: payment.currencyCode,
        regionalPricingMode:
          typeof metadata.regionalPricingMode === 'string' &&
          (metadata.regionalPricingMode === 'EGYPT_LOCAL' ||
            metadata.regionalPricingMode === 'INTERNATIONAL')
            ? (metadata.regionalPricingMode as PaymentRegionalPricingMode)
            : payment.currencyCode === 'EGP'
              ? 'EGYPT_LOCAL'
              : 'INTERNATIONAL',
        resolvedCountryIsoCode:
          typeof metadata.resolvedCountryIsoCode === 'string'
            ? metadata.resolvedCountryIsoCode
            : null,
        providerPaymentId: payment.providerPaymentRef ?? null,
        providerReference: payment.providerOrderRef ?? null,
        providerMethod:
          typeof metadata.paymobPaymentMethod === 'string'
            ? String(metadata.paymobPaymentMethod)
            : typeof metadata.paymobCheckoutMethod === 'string'
              ? String(metadata.paymobCheckoutMethod)
              : typeof metadata.providerMethod === 'string'
                ? String(metadata.providerMethod)
                : null,
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
            scheduledStartAt:
              payment.session.scheduledStartAt?.toISOString() ?? null,
            scheduledEndAt:
              payment.session.scheduledEndAt?.toISOString() ?? null,
            provider: payment.session.provider,
            providerRoomId: payment.session.providerRoomId,
            providerSessionRef: payment.session.providerSessionRef,
          }
        : null,
      refundSummary: {
        totalCount: payment.refunds.length,
        requestedCount: payment.refunds.filter(
          (item) => item.status === RefundStatus.REQUESTED,
        ).length,
        processingCount: payment.refunds.filter(
          (item) => item.status === RefundStatus.PROCESSING,
        ).length,
        succeededCount: payment.refunds.filter(
          (item) => item.status === RefundStatus.SUCCEEDED,
        ).length,
        failedCount: payment.refunds.filter(
          (item) => item.status === RefundStatus.FAILED,
        ).length,
        cancelledCount: payment.refunds.filter(
          (item) => item.status === RefundStatus.CANCELLED,
        ).length,
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
