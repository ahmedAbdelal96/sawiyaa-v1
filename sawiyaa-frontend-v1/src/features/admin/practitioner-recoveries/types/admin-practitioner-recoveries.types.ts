import type { PaymentProvider, PaymentStatus } from "@/features/payments/types/payments.types";

export type PractitionerRecoveryStatus = "OPEN" | "PARTIALLY_RECOVERED" | "RECOVERED" | "WAIVED";
export type PractitionerRecoveryReasonCode =
  | "REFUND_AFTER_PAYOUT"
  | "REFUND_AFTER_APPROVAL"
  | "MANUAL_FINANCE_CORRECTION"
  | "ADMIN_EXCEPTION";
export type PractitionerRecoveryActionType = "APPLIED_TO_PAYOUT" | "MANUALLY_COLLECTED" | "WAIVED";
export type SessionStatus = "DRAFT" | "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" | "PATIENT_NO_SHOW";
export type SessionPaymentCoverageType = "DIRECT_PAYMENT" | "PACKAGE";
export type SessionEarningReviewSourceType = "DIRECT_SESSION" | "PACKAGE_SESSION";
export type SessionEarningReviewDecision =
  | "AUTO_CREATED"
  | "APPROVED_AS_IS"
  | "EDITED_AND_APPROVED"
  | "REJECTED_PAYOUT"
  | "EXCLUDED_FROM_PAYOUT";
export type SessionEarningReviewStatus = "PENDING_REVIEW" | "APPROVED" | "REJECTED" | "EXCLUDED_FROM_PAYOUT";
export type RefundStatus = "REQUESTED" | "PROCESSING" | "SUCCEEDED" | "FAILED" | "CANCELLED";
export type RefundDestination = "PAYMENT_METHOD" | "WALLET" | "MANUAL";
export type PackageSettlementStatus =
  | "HELD"
  | "READY_TO_RELEASE"
  | "PARTIALLY_RELEASED"
  | "RELEASED"
  | "NEEDS_REVIEW"
  | "REFUNDED_OR_ADJUSTED";

export type ListAdminPractitionerRecoveriesParams = {
  page?: number;
  limit?: number;
  practitionerId?: string;
  status?: PractitionerRecoveryStatus;
  currencyCode?: string;
  reasonCode?: PractitionerRecoveryReasonCode;
  createdFrom?: string;
  createdTo?: string;
};

export type AdminPractitionerRecoveryQueryFilters = {
  page: number;
  limit: number;
  practitionerId: string | null;
  status: PractitionerRecoveryStatus | null;
  currencyCode: string | null;
  reasonCode: PractitionerRecoveryReasonCode | null;
  createdFrom: string | null;
  createdTo: string | null;
};

export type AdminPractitionerRecoveryUserSummary = {
  userId: string;
  displayName: string | null;
};

export type AdminPractitionerRecoveryPractitionerSummary = {
  practitionerId: string;
  displayName: string | null;
  publicSlug: string | null;
  professionalTitle: string | null;
};

export type AdminPractitionerRecoverySessionSummary = {
  sessionId: string;
  sessionCode: string;
  status: SessionStatus | null;
  paymentCoverageType: SessionPaymentCoverageType | null;
  scheduledStartAt: string | null;
  scheduledEndAt: string | null;
  completedAt: string | null;
};

export type AdminPractitionerRecoveryPaymentSummary = {
  paymentId: string | null;
  status: PaymentStatus | null;
  paymentPurpose: string | null;
  provider: PaymentProvider | null;
  amountTotal: string | null;
  currencyCode: string | null;
  providerPaymentRef: string | null;
  providerOrderRef: string | null;
  initiatedAt: string | null;
  capturedAt: string | null;
  failedAt: string | null;
  expiredAt: string | null;
};

export type AdminPractitionerRecoveryRefundSummary = {
  refundId: string;
  status: RefundStatus;
  amount: string;
  currencyCode: string;
  destination: RefundDestination;
  requestedAt: string | null;
  processedAt: string | null;
  failedAt: string | null;
  providerRefundRef: string | null;
};

export type AdminPractitionerRecoverySessionEarningReviewSummary = {
  sessionEarningReviewId: string;
  sourceType: SessionEarningReviewSourceType;
  reviewDecision: SessionEarningReviewDecision;
  reviewStatus: SessionEarningReviewStatus | null;
};

export type AdminPractitionerRecoverySettlementSummary = {
  settlementId: string | null;
  status: PackageSettlementStatus | null;
  amountNet: string | null;
  amountPaidTotal: string | null;
  currencyCode: string | null;
};

export type AdminPractitionerRecoveryActionItem = {
  id: string;
  actionType: PractitionerRecoveryActionType;
  amount: string;
  payoutId: string | null;
  reason: string | null;
  performedBy: AdminPractitionerRecoveryUserSummary | null;
  createdAt: string;
};

export type AdminPractitionerRecoveryListItem = {
  recoveryId: string;
  practitioner: AdminPractitionerRecoveryPractitionerSummary;
  session: AdminPractitionerRecoverySessionSummary | null;
  payment: AdminPractitionerRecoveryPaymentSummary | null;
  refund: AdminPractitionerRecoveryRefundSummary | null;
  sessionEarningReview: AdminPractitionerRecoverySessionEarningReviewSummary | null;
  settlement: AdminPractitionerRecoverySettlementSummary | null;
  payoutId: string | null;
  amount: string;
  recoveredAmount: string;
  remainingAmount: string;
  currencyCode: string;
  status: PractitionerRecoveryStatus;
  reasonCode: PractitionerRecoveryReasonCode;
  createdAt: string;
  resolvedAt: string | null;
};

export type AdminPractitionerRecoveryDetailItem = AdminPractitionerRecoveryListItem & {
  internalReason: string | null;
  practitionerFacingNote: string | null;
  createdBy: AdminPractitionerRecoveryUserSummary | null;
  resolvedBy: AdminPractitionerRecoveryUserSummary | null;
  actionHistory: AdminPractitionerRecoveryActionItem[];
};

export type AdminPractitionerRecoveriesListData = {
  items: AdminPractitionerRecoveryListItem[];
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  };
  filters: AdminPractitionerRecoveryQueryFilters;
};

export type AdminPractitionerRecoveryDetailData = {
  item: AdminPractitionerRecoveryDetailItem;
};

export type MarkAdminPractitionerRecoveryCollectedPayload = {
  amountCollected: string;
  idempotencyKey: string;
  note?: string | null;
};

export type WaiveAdminPractitionerRecoveryPayload = {
  reason: string;
  idempotencyKey: string;
  note?: string | null;
};

export type AdminPractitionerRecoveryMutationResult = {
  item: AdminPractitionerRecoveryDetailItem;
  wasAlreadyRecorded?: boolean;
};
