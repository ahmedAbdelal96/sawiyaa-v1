import type { PaymentProvider, PaymentStatus } from "@/features/payments/types/payments.types";

export type AdminPaymentPurpose =
  | "SESSION_BOOKING"
  | "SESSION_INSTANT_BOOKING"
  | "SESSION_EXTENSION"
  | "SESSION_PACKAGE_PURCHASE"
  | "ACADEMY_PROGRAM_ENROLLMENT"
  | "MANUAL_INVOICE";

export type AdminRefundType = "FULL" | "PARTIAL";

export type AdminRefundStatus =
  | "REQUESTED"
  | "PROCESSING"
  | "SUCCEEDED"
  | "FAILED"
  | "CANCELLED";

export type AdminPaymentRefundSummaryStatus = "NONE" | "PENDING" | "REFUNDED" | "PARTIALLY_REFUNDED" | "FAILED";

export type AdminIncomingPaymentsQuery = {
  page?: number;
  limit?: number;
  query?: string;
  provider?: string;
  status?: PaymentStatus;
  refundStatus?: AdminPaymentRefundSummaryStatus;
  currency?: string;
  createdFrom?: string;
  createdTo?: string;
  sortBy?: "createdAt" | "amountTotal";
  sortDirection?: "asc" | "desc";
};

export type AdminIncomingPaymentItem = {
  id: string;
  customer: string | null;
  paymentReference: string | null;
  provider: PaymentProvider;
  amount: string;
  currency: string;
  paymentStatus: PaymentStatus;
  refundStatus: AdminPaymentRefundSummaryStatus;
  paidAt: string | null;
  lastUpdated: string;
  createdAt: string;
  initiatedAt: string;
  failedAt: string | null;
  paymentPurpose: AdminPaymentPurpose;
  refundCount: number;
  refundedAmount: string;
  session: { id: string; sessionCode: string | null; reference?: string | null; status?: string | null } | null;
  settlement: { id: string | null; reviewId: string; reviewStatus: string; financialStage: string; reference?: string | null; status: string } | null;
};

export type AdminIncomingPaymentsResponseData = {
  items: AdminIncomingPaymentItem[];
  pagination: { page: number; limit: number; totalItems: number; totalPages: number };
};

export type AdminPaymentSessionMode = "VIDEO" | "AUDIO" | "CHAT";
export type AdminPaymentSessionProvider = "NONE" | "DAILY" | "ZOOM";
export type AdminPaymentSessionStatus =
  | "DRAFT"
  | "PENDING_PAYMENT"
  | "PENDING_PRACTITIONER_CONFIRMATION"
  | "UPCOMING"
  | "READY_TO_JOIN"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED"
  | "PATIENT_NO_SHOW"
  | "EXPIRED"
  | "REFUND_PENDING"
  | "REFUNDED";

export type AdminPaymentOpsPaymentSummary = {
  id: string;
  purpose: AdminPaymentPurpose;
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

export type AdminPaymentOpsSessionContext = {
  id: string;
  sessionCode: string;
  status: AdminPaymentSessionStatus;
  sessionMode: AdminPaymentSessionMode;
  scheduledStartAt: string | null;
  scheduledEndAt: string | null;
  provider: AdminPaymentSessionProvider;
  providerRoomId: string | null;
  providerSessionRef: string | null;
} | null;

export type AdminPaymentRefundSummary = {
  totalCount: number;
  requestedCount: number;
  processingCount: number;
  succeededCount: number;
  failedCount: number;
  cancelledCount: number;
  totalRefundedAmount: string;
  lastRefundAt: string | null;
};

export type AdminPaymentRefundItem = {
  id: string;
  paymentId: string;
  sessionId: string | null;
  sessionCode: string | null;
  refundType: AdminRefundType;
  status: AdminRefundStatus;
  amount: string;
  currency: string;
  reason: string | null;
  providerRefundRef: string | null;
  requestedAt: string;
  processedAt: string | null;
  failedAt: string | null;
  createdAt: string;
};

export type AdminPaymentEventItem = {
  id: string;
  eventType: string;
  providerEventRef: string | null;
  createdAt: string;
};

export type AdminPaymentOpsRelatedSettlement = {
  id: string;
  reviewId: string;
  reference: string | null;
  reviewStatus: string;
  financialStage: string;
  status: string;
  practitionerName: string;
  originalAmount: string;
  originalCurrency: string;
  finalAmount: string;
  walletCurrency: string;
};

export type AdminPaymentOpsItem = {
  payment: AdminPaymentOpsPaymentSummary;
  session: AdminPaymentOpsSessionContext;
  refundSummary: AdminPaymentRefundSummary;
  refunds: AdminPaymentRefundItem[];
  recentEvents: AdminPaymentEventItem[];
  relatedSettlement?: AdminPaymentOpsRelatedSettlement | null;
};

export type AdminPaymentOpsResponseData = {
  item: AdminPaymentOpsItem;
};

export type AdminRefundListResponseData = {
  items: AdminPaymentRefundItem[];
};

export type AdminRefundItemResponseData = {
  item: AdminPaymentRefundItem;
};

export type RequestAdminRefundInput = {
  amount?: number;
  reason?: string;
};
