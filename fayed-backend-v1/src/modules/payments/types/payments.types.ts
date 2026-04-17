import { PaymentProvider, PaymentStatus, RefundStatus, RefundType } from '@prisma/client';

export interface PaymentViewModel {
  id: string;
  sessionId: string | null;
  provider: PaymentProvider;
  status: PaymentStatus;
  amount: string;
  currency: string;
  providerPaymentId: string | null;
  providerReference: string | null;
  checkoutUrl: string | null;
  clientSecret: string | null;
  paidAt: string | null;
  failedAt: string | null;
  expiredAt: string | null;
  refundedAt: string | null;
  createdAt: string;
}

export interface RefundViewModel {
  id: string;
  paymentId: string;
  sessionId: string | null;
  refundType: RefundType;
  status: RefundStatus;
  amount: string;
  currency: string;
  reason: string | null;
  providerRefundRef: string | null;
  requestedAt: string;
  processedAt: string | null;
  failedAt: string | null;
  createdAt: string;
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
    currency: string;
    providerPaymentId: string | null;
    providerReference: string | null;
    createdAt: string;
    initiatedAt: string;
    capturedAt: string | null;
    failedAt: string | null;
    expiredAt: string | null;
  };
  session: {
    id: string;
    status: string;
    sessionMode: string;
    scheduledStartAt: string | null;
    scheduledEndAt: string | null;
    provider: string;
    providerRoomId: string | null;
    providerSessionRef: string | null;
  } | null;
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
}
