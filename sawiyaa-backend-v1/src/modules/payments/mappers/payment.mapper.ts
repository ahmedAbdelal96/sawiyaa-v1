import { Injectable } from '@nestjs/common';
import {
  Payment,
  PaymentProvider,
  PaymentStatus,
  Prisma,
  Refund,
  RefundStatus,
  SessionStatus,
} from '@prisma/client';
import { PaymentRegionalPricingMode } from '@common/payments/payment-region.resolver';
import {
  AdminPaymentOpsViewModel,
  PaymentAction,
  PatientRefundViewModel,
  PaymentViewModel,
  RefundViewModel,
} from '../types/payments.types';

type PaymentWithRefundsAndSession = Payment & {
  refunds?: Array<Pick<Refund, 'id' | 'paymentId' | 'sessionId' | 'refundType' | 'destination' | 'status' | 'amount' | 'currencyCode' | 'refundReason' | 'requestedAt' | 'processedAt' | 'failedAt' | 'customerWalletCreditedAt' | 'createdAt'> & { session?: { sessionCode: string } | null }>;
  session?: {
    id: string;
    sessionCode: string;
    status: SessionStatus;
    expiresAt: Date | null;
  } | null;
};

@Injectable()
export class PaymentMapper {
  private readonly safeFailureCategories = new Set([
    'CARD_DECLINED',
    'INSUFFICIENT_FUNDS',
    'AUTHENTICATION_REQUIRED',
    'PROVIDER_TIMEOUT',
    'PROVIDER_UNAVAILABLE',
    'INVALID_PAYMENT',
    'CANCELLED_BY_CUSTOMER',
    'UNKNOWN_PROVIDER_FAILURE',
  ]);

  private normalizeFailureCategory(reason: string | null | undefined): string | null {
    if (!reason) return null;
    const value = reason.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_');
    return this.safeFailureCategories.has(value) ? value : 'UNKNOWN_PROVIDER_FAILURE';
  }

  private timelineEntry(input: {
    id: string;
    type: string;
    occurredAt: Date;
    reference?: string | null;
    reason?: string | null;
  }) {
    return {
      id: input.id,
      type: input.type,
      occurredAt: input.occurredAt.toISOString(),
      reference: input.reference ?? null,
      reason: input.reason ?? null,
    };
  }

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
      sessionCode: payment.session?.sessionCode ?? null,
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
      refunds: (payment.refunds ?? [])
        .filter((refund) => Boolean(refund && refund.id))
        .map((refund) => this.toPatientRefundViewModel(refund)),
    };
  }

  private toPatientRefundViewModel(
    refund: NonNullable<PaymentWithRefundsAndSession['refunds']>[number],
  ): PatientRefundViewModel {
    return {
      id: refund.id,
      paymentId: refund.paymentId,
      sessionId: refund.sessionId ?? null,
      sessionCode: refund.session?.sessionCode ?? null,
      refundType: refund.refundType,
      destination: refund.destination,
      status: refund.status,
      amount: refund.amount.toString(),
      currency: refund.currencyCode,
      reason: refund.refundReason ?? null,
      requestedAt: refund.requestedAt.toISOString(),
      processedAt: refund.processedAt?.toISOString() ?? null,
      failedAt: refund.failedAt?.toISOString() ?? null,
      customerWalletCreditedAt: refund.customerWalletCreditedAt?.toISOString() ?? null,
      createdAt: refund.createdAt.toISOString(),
    };
  }

  toRefundViewModel(
    refund: Refund & { session?: { sessionCode: string } | null },
    sessionCode: string | null = null,
    provider: PaymentProvider | null = null,
  ): RefundViewModel {
    const metadata = (refund.metadataJson ?? {}) as Record<string, unknown>;
    const reconciliation =
      metadata.providerReconciliation &&
      typeof metadata.providerReconciliation === 'object'
        ? (metadata.providerReconciliation as Record<string, unknown>)
        : null;
    const reconciliationEvidence = reconciliation?.evidence;
    return {
      id: refund.id,
      paymentId: refund.paymentId,
      sessionId: refund.sessionId ?? null,
      sessionCode: sessionCode ?? refund.session?.sessionCode ?? null,
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
      manualProviderFinalizationAvailable:
        refund.status === RefundStatus.PROCESSING &&
        provider === PaymentProvider.PAYMOB &&
        reconciliation?.outcome === 'UNKNOWN',
      providerReconciliationOutcome:
        typeof reconciliation?.outcome === 'string'
          ? reconciliation.outcome
          : null,
      providerReconciliationLastAttemptAt:
        typeof reconciliation?.lastAttemptAt === 'string'
          ? reconciliation.lastAttemptAt
          : null,
      providerReconciliationEvidence:
        reconciliationEvidence && typeof reconciliationEvidence === 'object'
          ? JSON.stringify(reconciliationEvidence)
          : null,
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
    patient?: { id: string; displayName: string | null; user?: { displayName: string | null } | null } | null;
    patientPackagePurchase?: { id: string; titleSnapshot: string | null; planCodeSnapshot: string | null; status: string; packageSettlement?: { id: string; status: string } | null } | null;
    academyProgramEnrollment?: { id: string; academyProgramId: string; status: string; paymentStatus: string; registeredAt: Date; academyProgram: { id: string; slug: string; titleAr: string; titleEn: string } } | null;
    session: {
      id: string;
      sessionCode: string;
      status: string;
      sessionMode: string;
      scheduledStartAt: Date | null;
      scheduledEndAt: Date | null;
      provider: string;
      providerRoomId: string | null;
      providerSessionRef: string | null;
      durationMinutes?: number;
      practitioner?: { publicSlug: string | null; user: { displayName: string | null } | null } | null;
      cancellationRecord?: { cancellationAllowed: boolean; cancelledPaymentId: string | null; createdAt: Date } | null;
    } | null;
    refunds: Refund[];
    events: Array<{
      id: string;
      eventType: string;
      providerEventRef: string | null;
      reason?: string | null;
      occurredAt?: Date;
      createdAt: Date;
    }>;
    sessionEvents?: Array<{ id: string; eventType: string; occurredAt?: Date | null; createdAt: Date }>;
    walletEntries?: Array<{ id: string; entryType: string; direction: string; amount: Prisma.Decimal; currencyCode: string; occurredAt: Date; createdAt: Date }>;
    webhookReceipts?: Array<{ id: string; providerEventRef: string; receivedAt: Date; processedAt: Date }>;
    journalEntries?: Array<{ id: string; sourceType: string; occurredAt: Date }>;
    operationalExceptions?: Array<{
      id: string;
      type: string;
      status: string;
      provider: string;
      ownerUserId: string | null;
      reason: string;
      resolutionNote: string | null;
      createdAt: Date;
      resolvedAt: Date | null;
    }>;
  }): AdminPaymentOpsViewModel {
    const metadata = (payment.metadataJson ?? {}) as Record<string, unknown>;
    const refunds = payment.refunds.map((refund) =>
      this.toRefundViewModel(
        refund,
        payment.session?.sessionCode ?? null,
        payment.provider,
      ),
    );
    const totalRefundedAmount = payment.refunds
      .filter((refund) => refund.status === RefundStatus.SUCCEEDED)
      .reduce((sum, refund) => sum + Number(refund.amount.toString()), 0);

    const chronologicalEvents = [...payment.events].sort(
      (a, b) => (a.occurredAt ?? a.createdAt).getTime() - (b.occurredAt ?? b.createdAt).getTime(),
    );
    const failureEvent = [...chronologicalEvents]
      .reverse()
      .find((event) => event.eventType === 'PAYMENT_FAILED');
    const attemptEvents = chronologicalEvents.filter((event) =>
      event.eventType === 'PROVIDER_CHECKOUT_CREATED' ||
      event.eventType === 'PROVIDER_WEBHOOK_RECEIVED',
    );
    const lastAttemptAt = attemptEvents.length
      ? (attemptEvents[attemptEvents.length - 1].occurredAt ?? attemptEvents[attemptEvents.length - 1].createdAt)
      : payment.failedAt ?? payment.initiatedAt;
    const retryAvailable = payment.status === PaymentStatus.FAILED || payment.status === PaymentStatus.EXPIRED;
    const recommendedNextAction = retryAvailable
      ? 'RETRY_PAYMENT'
      : payment.status === PaymentStatus.PENDING || payment.status === PaymentStatus.REQUIRES_ACTION
        ? 'AWAIT_PROVIDER'
        : payment.status === PaymentStatus.CAPTURED
          ? 'NONE'
          : 'REVIEW_EXCEPTION';
    const timeline = [
      ...(payment.sessionEvents ?? []).map((event) =>
        this.timelineEntry({
          id: event.id,
          type: `SESSION_${event.eventType}`,
          occurredAt: event.occurredAt ?? event.createdAt,
        }),
      ),
      ...payment.events.map((event) =>
        this.timelineEntry({
          id: event.id,
          type: event.eventType,
          occurredAt: event.occurredAt ?? event.createdAt,
          reference: event.providerEventRef,
          reason: this.normalizeFailureCategory(event.reason),
        }),
      ),
      ...(payment.webhookReceipts ?? []).map((receipt) =>
        this.timelineEntry({
          id: receipt.id,
          type: 'PROVIDER_WEBHOOK_RECEIPT',
          occurredAt: receipt.receivedAt,
          reference: receipt.providerEventRef,
        }),
      ),
      ...(payment.walletEntries ?? []).map((entry) =>
        this.timelineEntry({
          id: entry.id,
          type: `WALLET_${entry.entryType}`,
          occurredAt: entry.occurredAt,
          reference: entry.currencyCode,
        }),
      ),
      ...(payment.journalEntries ?? []).map((entry) =>
        this.timelineEntry({
          id: entry.id,
          type: `JOURNAL_${entry.sourceType}`,
          occurredAt: entry.occurredAt,
        }),
      ),
    ].sort((a, b) => a.occurredAt.localeCompare(b.occurredAt) || a.id.localeCompare(b.id));

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
        patientId: payment.patient?.id ?? null,
        patientName: payment.patient?.user?.displayName ?? payment.patient?.displayName ?? null,
      },
      packagePurchase: payment.patientPackagePurchase
        ? {
            id: payment.patientPackagePurchase.id,
            title: payment.patientPackagePurchase.titleSnapshot,
            planCode: payment.patientPackagePurchase.planCodeSnapshot,
            status: payment.patientPackagePurchase.status,
            settlementId: payment.patientPackagePurchase.packageSettlement?.id ?? null,
          }
        : null,
      academyEnrollment: payment.academyProgramEnrollment
        ? {
            id: payment.academyProgramEnrollment.id,
            programId: payment.academyProgramEnrollment.academyProgram.id,
            programSlug: payment.academyProgramEnrollment.academyProgram.slug,
            programTitleAr: payment.academyProgramEnrollment.academyProgram.titleAr,
            programTitleEn: payment.academyProgramEnrollment.academyProgram.titleEn,
            status: payment.academyProgramEnrollment.status,
            paymentStatus: payment.academyProgramEnrollment.paymentStatus,
            registeredAt: payment.academyProgramEnrollment.registeredAt.toISOString(),
          }
        : null,
      session: payment.session
        ? {
            id: payment.session.id,
            sessionCode: payment.session.sessionCode,
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
      sessionSummary: payment.session
        ? {
            id: payment.session.id,
            sessionCode: payment.session.sessionCode,
            status: payment.session.status,
            scheduledStartAt: payment.session.scheduledStartAt?.toISOString() ?? null,
            scheduledEndAt: payment.session.scheduledEndAt?.toISOString() ?? null,
            durationMinutes: payment.session.durationMinutes ?? 0,
            practitionerName:
              payment.session.practitioner?.user?.displayName ?? payment.session.practitioner?.publicSlug ?? null,
            bookingState: payment.session.status,
            paymentState: payment.status,
            cancellationState: payment.session.cancellationRecord ? 'CANCELLED' : 'NOT_CANCELLED',
          }
        : null,
      failureDiagnosis: {
        category: this.normalizeFailureCategory(failureEvent?.reason),
        provider: payment.provider,
        attemptNumber: Math.max(1, attemptEvents.length),
        lastAttemptAt: lastAttemptAt.toISOString(),
        retryAvailable,
        recommendedNextAction,
      },
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
      recentEvents: payment.events.slice(-15).reverse().map((event) => ({
        id: event.id,
        eventType: event.eventType,
        providerEventRef: event.providerEventRef ?? null,
        createdAt: event.createdAt.toISOString(),
      })),
      timeline,
      exceptions: (payment.operationalExceptions ?? []).map((exception) => ({
        id: exception.id,
        type: exception.type,
        status: exception.status,
        provider: exception.provider,
        ownerUserId: exception.ownerUserId,
        reason: exception.reason,
        resolutionNote: exception.resolutionNote,
        createdAt: exception.createdAt.toISOString(),
        resolvedAt: exception.resolvedAt?.toISOString() ?? null,
      })),
    };
  }
}
