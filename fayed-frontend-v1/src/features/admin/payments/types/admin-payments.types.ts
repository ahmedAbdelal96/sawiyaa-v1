import type { PaymentProvider, PaymentStatus } from "@/features/payments/types/payments.types";

export type AdminPaymentPurpose =
  | "SESSION_BOOKING"
  | "SESSION_INSTANT_BOOKING"
  | "SESSION_EXTENSION"
  | "COURSE_ENROLLMENT"
  | "MANUAL_INVOICE";

export type AdminRefundType = "FULL" | "PARTIAL";

export type AdminRefundStatus =
  | "REQUESTED"
  | "PROCESSING"
  | "SUCCEEDED"
  | "FAILED"
  | "CANCELLED";

export type AdminPaymentSessionMode = "VIDEO" | "AUDIO" | "CHAT";
export type AdminPaymentSessionProvider = "NONE" | "DAILY" | "ZOOM";
export type AdminPaymentSessionStatus =
  | "DRAFT"
  | "PENDING_PAYMENT"
  | "PENDING_PRACTITIONER_RESPONSE"
  | "CONFIRMED"
  | "UPCOMING"
  | "READY_TO_JOIN"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED"
  | "NO_SHOW"
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

export type AdminPaymentOpsItem = {
  payment: AdminPaymentOpsPaymentSummary;
  session: AdminPaymentOpsSessionContext;
  refundSummary: AdminPaymentRefundSummary;
  refunds: AdminPaymentRefundItem[];
  recentEvents: AdminPaymentEventItem[];
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
