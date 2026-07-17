import type { PaymentProvider, PaymentStatus } from "@/features/payments/types/payments.types";

export type SessionEarningReviewSourceType = "DIRECT_SESSION" | "PACKAGE_SESSION";
export type SessionEarningReviewStatus =
  | "PENDING_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "EXCLUDED_FROM_PAYOUT";
export type SessionEarningReviewDecision =
  | "AUTO_CREATED"
  | "APPROVED_AS_IS"
  | "EDITED_AND_APPROVED"
  | "REJECTED_PAYOUT"
  | "EXCLUDED_FROM_PAYOUT";
export type SessionEarningReviewModerationAction =
  | "APPROVE_AS_IS"
  | "EDIT_AND_APPROVE"
  | "REJECT_PAYOUT"
  | "EXCLUDE_FROM_PAYOUT";

export type SessionPaymentCoverageType = "DIRECT_PAYMENT" | "PACKAGE";
export type SessionStatus =
  | "DRAFT"
  | "SCHEDULED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED"
  | "PATIENT_NO_SHOW";
export type PatientPackagePurchaseStatus =
  | "PENDING_PAYMENT"
  | "PAID"
  | "ACTIVE"
  | "COMPLETED"
  | "CANCELLED"
  | "REFUNDED"
  | "EXPIRED";
export type PackageSettlementStatus =
  | "HELD"
  | "READY_TO_RELEASE"
  | "PARTIALLY_RELEASED"
  | "RELEASED"
  | "NEEDS_REVIEW"
  | "REFUNDED_OR_ADJUSTED";
export type LedgerEntryType = "PRACTITIONER_EARNING" | "PLATFORM_COMMISSION";
export type LedgerDirection = "CREDIT" | "DEBIT";
export type WalletBalanceBucket = "AVAILABLE" | "HELD";
export type RefundStatus = "REQUESTED" | "PROCESSING" | "SUCCEEDED" | "FAILED" | "CANCELLED";
export type RefundDestination = "PAYMENT_METHOD" | "WALLET" | "MANUAL";

export type ListAdminSessionEarningReviewsParams = {
  page?: number;
  limit?: number;
  search?: string;
  sourceType?: SessionEarningReviewSourceType;
  status?: SessionEarningReviewStatus;
  decision?: SessionEarningReviewDecision;
  practitionerId?: string;
  patientId?: string;
  sessionId?: string;
  paymentId?: string;
  currencyCode?: string;
  createdFrom?: string;
  createdTo?: string;
  reviewedFrom?: string;
  reviewedTo?: string;
  actionRequired?: boolean;
  finalized?: boolean;
};

export type AdminSessionEarningReviewPagination = {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
};

export type AdminSessionEarningReviewFilters = {
  status: SessionEarningReviewStatus | null;
  decision: SessionEarningReviewDecision | null;
  sourceType: SessionEarningReviewSourceType | null;
  practitionerId: string | null;
  patientId: string | null;
  sessionId: string | null;
  paymentId: string | null;
  currencyCode: string | null;
  search: string | null;
  createdFrom: string | null;
  createdTo: string | null;
  reviewedFrom: string | null;
  reviewedTo: string | null;
  actionRequired: boolean | null;
  finalized: boolean | null;
};

export type AdminSessionEarningReviewUserSummary = {
  userId: string;
  displayName: string | null;
};

export type AdminSessionEarningReviewPractitionerSummary = {
  practitionerId: string;
  displayName: string | null;
  publicSlug: string | null;
  professionalTitle: string | null;
};

export type AdminSessionEarningReviewPatientSummary = {
  patientId: string;
  displayName: string | null;
};

export type AdminSessionEarningReviewSessionSummary = {
  sessionId: string;
  sessionCode: string;
  status: SessionStatus;
  paymentCoverageType: SessionPaymentCoverageType;
  scheduledStartAt: string | null;
  scheduledEndAt: string | null;
  completedAt: string | null;
  packagePurchaseId: string | null;
  packageSessionIndex: number | null;
  packageSessionCount: number | null;
};

export type AdminSessionEarningReviewRefundSummary = {
  id: string;
  status: RefundStatus;
  amount: string;
  currencyCode: string;
  requestedAt: string;
  processedAt: string | null;
  failedAt: string | null;
  destination: RefundDestination;
  refundReason: string | null;
  providerRefundRef: string | null;
};

export type AdminSessionEarningReviewLedgerEntry = {
  id: string;
  entryType: LedgerEntryType;
  direction: LedgerDirection;
  amount: string;
  currencyCode: string;
  balanceBucket: WalletBalanceBucket;
  referenceType: string | null;
  referenceId: string | null;
  createdAt: string;
};

export type AdminSessionEarningReviewPaymentSummary = {
  paymentId: string | null;
  status: PaymentStatus | null;
  paymentPurpose: string | null;
  provider: PaymentProvider | null;
  currencyCode: string | null;
  amountTotal: string | null;
  refundedAmount: string | null;
  remainingEffectiveAmount: string | null;
  providerPaymentRef: string | null;
  providerOrderRef: string | null;
  initiatedAt: string | null;
  capturedAt: string | null;
  failedAt: string | null;
  expiredAt: string | null;
  refunds: AdminSessionEarningReviewRefundSummary[];
  reversalLedgerEntries: AdminSessionEarningReviewLedgerEntry[] | null;
};

export type AdminSessionEarningReviewPackagePurchaseSummary = {
  packagePurchaseId: string | null;
  status: PatientPackagePurchaseStatus | null;
  titleSnapshot: string | null;
  slugSnapshot: string | null;
  sessionCountSnapshot: number | null;
  selectedCurrencyCode: string | null;
  patientPayableTotalSnapshot: string | null;
  practitionerFinalShareSnapshot: string | null;
  platformFinalShareSnapshot: string | null;
  paymentId: string | null;
  packageSettlementId: string | null;
};

export type AdminSessionEarningReviewPackageSettlementSummary = {
  packageSettlementId: string | null;
  status: PackageSettlementStatus | null;
  currencyCode: string | null;
  sessionCount: number | null;
  completedSessionsCount: number | null;
  heldPractitionerAmount: string | null;
  heldPlatformAmount: string | null;
  releasablePractitionerAmount: string | null;
  releasedPractitionerAmount: string | null;
  normalEquivalentUsedAmount: string | null;
  discountAppliedAmount: string | null;
  reviewedAt: string | null;
  releasedAt: string | null;
  decision: string | null;
  notes: string | null;
};

export type AdminSessionEarningReviewListItem = {
  reviewId: string;
  sourceType: SessionEarningReviewSourceType;
  reviewStatus: SessionEarningReviewStatus;
  reviewDecision: SessionEarningReviewDecision;
  paymentAmount: string;
  paymentCurrencyCode: string;
  suggestedPractitionerAmount: string;
  suggestedPlatformAmount: string;
  suggestedCurrencyCode: string;
  finalPractitionerAmount: string | null;
  finalPlatformAmount: string | null;
  finalCurrencyCode: string | null;
  reviewedAt: string | null;
  approvedAt: string | null;
  reviewedBy: AdminSessionEarningReviewUserSummary | null;
  approvedBy: AdminSessionEarningReviewUserSummary | null;
  practitioner: AdminSessionEarningReviewPractitionerSummary;
  patient: AdminSessionEarningReviewPatientSummary;
  session: AdminSessionEarningReviewSessionSummary;
  payment: AdminSessionEarningReviewPaymentSummary | null;
  packagePurchase: AdminSessionEarningReviewPackagePurchaseSummary | null;
  packageSettlement: AdminSessionEarningReviewPackageSettlementSummary | null;
  isActionRequired: boolean;
  isFinalized: boolean;
  canApprove: boolean;
  canAdjust: boolean;
  canReject: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AdminSessionEarningReviewDetailItem = AdminSessionEarningReviewListItem & {
  internalReason: string | null;
  practitionerFacingNote: string | null;
  ledgerEntries: AdminSessionEarningReviewLedgerEntry[];
};

export type AdminSessionEarningReviewsListData = {
  items: AdminSessionEarningReviewListItem[];
  pagination: AdminSessionEarningReviewPagination;
  filters: AdminSessionEarningReviewFilters;
};

export type AdminSessionEarningReviewDetailData = {
  item: AdminSessionEarningReviewDetailItem;
};

export type ModerateAdminSessionEarningReviewPayload = {
  action: SessionEarningReviewModerationAction;
  finalPractitionerAmount?: string | null;
  finalPlatformAmount?: string | null;
  finalCurrencyCode?: string | null;
  internalReason?: string | null;
  practitionerFacingNote?: string | null;
};

export type ModerateAdminSessionEarningReviewResult = {
  item: AdminSessionEarningReviewDetailItem;
  wasAlreadyPosted?: boolean;
};
