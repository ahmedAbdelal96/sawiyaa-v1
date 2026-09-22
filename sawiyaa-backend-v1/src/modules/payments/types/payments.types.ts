import {
  PaymentProvider,
  PaymentStatus,
  RefundDestination,
  RefundStatus,
  RefundType,
} from '@prisma/client';
import { PaymentRegionalPricingMode } from '@common/payments/payment-region.resolver';

export type PaymentActionReason =
  | 'PAYABLE'
  | 'SESSION_EXPIRED'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED'
  | 'REFUNDED'
  | 'UNAVAILABLE';

export interface PaymentAction {
  canPay: boolean;
  reason: PaymentActionReason;
  sessionStatus?: string;
  sessionExpiresAt?: string | null;
}

export interface PaymentViewModel {
  id: string;
  sessionId: string | null;
  sessionCode: string | null;
  provider: PaymentProvider;
  status: PaymentStatus;
  amountSubtotal: string;
  amountDiscount: string;
  amountTotal: string;
  amountFromWallet: string;
  amountFromGateway: string;
  amount: string;
  currency: string;
  regionalPricingMode: PaymentRegionalPricingMode | null;
  resolvedCountryIsoCode: string | null;
  providerPaymentId: string | null;
  providerReference: string | null;
  providerMethod: string | null;
  checkoutUrl: string | null;
  clientSecret: string | null;
  paidAt: string | null;
  failedAt: string | null;
  expiredAt: string | null;
  refundedAt: string | null;
  createdAt: string;
  paymentAction: PaymentAction;
  /** Patient-safe refund lifecycle projection. Provider reconciliation data is intentionally omitted. */
  refunds?: PatientRefundViewModel[];
}

export interface PatientRefundViewModel {
  id: string;
  paymentId: string;
  sessionId: string | null;
  sessionCode: string | null;
  refundType: RefundType;
  destination: RefundDestination;
  status: RefundStatus;
  amount: string;
  currency: string;
  reason: string | null;
  requestedAt: string;
  processedAt: string | null;
  failedAt: string | null;
  customerWalletCreditedAt: string | null;
  createdAt: string;
}

export interface RefundViewModel {
  id: string;
  paymentId: string;
  sessionId: string | null;
  sessionCode: string | null;
  refundType: RefundType;
  destination: RefundDestination;
  status: RefundStatus;
  amount: string;
  currency: string;
  reason: string | null;
  providerRefundRef: string | null;
  requestedAt: string;
  processedAt: string | null;
  failedAt: string | null;
  customerWalletCreditedAt: string | null;
  createdAt: string;
  manualProviderFinalizationAvailable: boolean;
  providerReconciliationOutcome: string | null;
  providerReconciliationLastAttemptAt: string | null;
  providerReconciliationEvidence: string | null;
}

export interface AdminPaymentOpsViewModel {
  payment: {
    id: string;
    purpose: string;
    provider: PaymentProvider;
    status: PaymentStatus;
    amountSubtotal: string;
    amountDiscount: string;
    amountTotal: string;
    amountFromWallet: string;
    amountFromGateway: string;
    currency: string;
    regionalPricingMode: PaymentRegionalPricingMode | null;
    resolvedCountryIsoCode: string | null;
    providerPaymentId: string | null;
    providerReference: string | null;
    providerMethod: string | null;
    createdAt: string;
    initiatedAt: string;
    capturedAt: string | null;
    failedAt: string | null;
    expiredAt: string | null;
    patientId: string | null;
    patientName: string | null;
  };
  packagePurchase: {
    id: string;
    title: string | null;
    planCode: string | null;
    status: string;
    settlementId: string | null;
  } | null;
  academyEnrollment: {
    id: string;
    programId: string;
    programSlug: string;
    programTitleAr: string;
    programTitleEn: string;
    status: string;
    paymentStatus: string;
    registeredAt: string;
  } | null;
  session: {
    id: string;
    sessionCode: string;
    status: string;
    sessionMode: string;
    scheduledStartAt: string | null;
    scheduledEndAt: string | null;
    provider: string;
    providerRoomId: string | null;
    providerSessionRef: string | null;
  } | null;
  sessionSummary: {
    id: string;
    sessionCode: string;
    status: string;
    scheduledStartAt: string | null;
    scheduledEndAt: string | null;
    durationMinutes: number;
    practitionerName: string | null;
    bookingState: string;
    paymentState: string;
    cancellationState: string;
  } | null;
  failureDiagnosis: {
    category: string | null;
    provider: PaymentProvider;
    attemptNumber: number;
    lastAttemptAt: string | null;
    retryAvailable: boolean;
    recommendedNextAction: 'RETRY_PAYMENT' | 'AWAIT_PROVIDER' | 'REVIEW_EXCEPTION' | 'NONE';
  };
  refundSummary: {
    totalCount: number;
    requestedCount: number;
    processingCount: number;
    succeededCount: number;
    failedCount: number;
    cancelledCount: number;
    totalRefundedAmount: string;
    lastRefundAt: string | null;
  };
  refunds: RefundViewModel[];
  recentEvents: Array<{
    id: string;
    eventType: string;
    providerEventRef: string | null;
    createdAt: string;
  }>;
  timeline: Array<{
    id: string;
    type: string;
    occurredAt: string;
    reference: string | null;
    reason: string | null;
  }>;
  exceptions: Array<{
    id: string;
    type: string;
    status: string;
    provider: string;
    ownerUserId: string | null;
    reason: string;
    resolutionNote: string | null;
    createdAt: string;
    resolvedAt: string | null;
  }>;
  relatedSettlement?: {
    id: string;
    reference: string | null;
    status: string;
    practitionerName: string;
    originalAmount: string;
    originalCurrency: string;
    finalAmount: string;
    walletCurrency: string;
  } | null;
}
