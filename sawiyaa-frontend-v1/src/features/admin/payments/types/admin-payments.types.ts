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
  patientId: string | null;
  patientName: string | null;
};

export type AdminPaymentOpsPackagePurchaseContext = {
  id: string;
  title: string | null;
  planCode: string | null;
  status: string;
  settlementId: string | null;
} | null;

export type AdminPaymentOpsAcademyEnrollmentContext = {
  id: string;
  programId: string;
  programSlug: string;
  programTitleAr: string;
  programTitleEn: string;
  status: string;
  paymentStatus: string;
  registeredAt: string;
} | null;

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
  customerWalletCreditedAt: string | null;
  createdAt: string;
  manualProviderFinalizationAvailable: boolean;
  providerReconciliationOutcome: string | null;
  providerReconciliationLastAttemptAt: string | null;
  providerReconciliationEvidence: string | null;
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
  packagePurchase: AdminPaymentOpsPackagePurchaseContext;
  academyEnrollment: AdminPaymentOpsAcademyEnrollmentContext;
  session: AdminPaymentOpsSessionContext;
  sessionSummary?: {
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
  failureDiagnosis?: {
    category: string | null;
    provider: PaymentProvider;
    attemptNumber: number;
    lastAttemptAt: string | null;
    retryAvailable: boolean;
    recommendedNextAction: string;
  };
  refundSummary: AdminPaymentRefundSummary;
  refunds: AdminPaymentRefundItem[];
  recentEvents: AdminPaymentEventItem[];
  timeline?: Array<{ id: string; type: string; occurredAt: string; reference: string | null; reason: string | null }>;
  exceptions?: Array<{ id: string; type: string; status: string; provider: string; ownerUserId: string | null; reason: string; resolutionNote: string | null; createdAt: string; resolvedAt: string | null }>;
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

export type ManualFinalizeAdminRefundInput = {
  outcome: "SUCCEEDED" | "FAILED";
  evidenceReference: string;
  reason: string;
  evidenceMetadata?: Record<string, string>;
};

export type AdminPaymentException = {
  id: string;
  paymentId: string;
  type: string;
  status: string;
  provider: string;
  ownerUserId: string | null;
  reason: string;
  resolutionNote: string | null;
  createdAt: string;
  resolvedAt: string | null;
};

export type CreateAdminPaymentExceptionInput = {
  paymentId: string;
  type: "LATE_PROVIDER_SUCCESS" | "WEBHOOK_CONFLICT" | "RECONCILIATION_ISSUE" | "UNKNOWN_PAYMENT_STATE";
  reason: string;
};
