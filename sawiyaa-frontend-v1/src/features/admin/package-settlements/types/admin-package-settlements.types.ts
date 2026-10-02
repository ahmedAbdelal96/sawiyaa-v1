export type PackageSettlementStatus =
  | "HELD"
  | "READY_TO_RELEASE"
  | "PARTIALLY_RELEASED"
  | "RELEASED"
  | "NEEDS_REVIEW"
  | "REFUNDED_OR_ADJUSTED";

export type ListAdminPackageSettlementsParams = {
  page?: number;
  limit?: number;
  status?: PackageSettlementStatus;
  currencyCode?: string;
  createdFrom?: string;
  createdTo?: string;
};

export type Pagination = {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
};

export type AdminPackageSettlementListItem = {
  id: string;
  purchaseId: string;
  purchaseStatus: string;
  practitionerId: string;
  practitionerDisplayName: string | null;
  practitionerSlug: string | null;
  patientId: string;
  patientDisplayName: string | null;
  packagePlanCode: string | null;
  packagePlanTitle: string | null;
  currency: string;
  status: PackageSettlementStatus;
  sessionCount: number;
  completedSessionsCount: number;
  heldPractitionerAmount: string;
  heldPlatformAmount: string;
  releasablePractitionerAmount: string;
  releasedPractitionerAmount: string;
  normalEquivalentUsedAmount: string;
  discountAppliedAmount: string;
  availableSessions: number;
  reservedSessions: number;
  consumedSessions: number;
  nextSessionStartAt: string | null;
  payment: {
    id: string;
    status: string;
    provider: string;
    reference: string | null;
    amount: string;
    currency: string;
    capturedAt: string | null;
  } | null;
  sessions: Array<{
    id: string;
    sessionCode: string;
    status: string;
    packageSessionIndex: number | null;
    packageSessionCount: number | null;
    scheduledStartAt: string | null;
    scheduledEndAt: string | null;
    paymentCoverageType: string;
    entitlementDecision: {
      decisionType: string;
      reasonCode: string;
      decidedAt: string;
    } | null;
  }>;
  reviewedAt: string | null;
  reviewedByAdminId: string | null;
  releasedAt: string | null;
  releasedByAdminId: string | null;
  decision: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AdminPackageSettlementDetail = AdminPackageSettlementListItem;

export type PackageSettlementListResponseData = {
  items: AdminPackageSettlementListItem[];
  pagination: Pagination;
};

export type PackageSettlementDetailResponseData = {
  item: AdminPackageSettlementDetail;
};

export type ReleasePackageSettlementResponseData = {
  item: AdminPackageSettlementDetail;
};

export type PackageRefundPreview = {
  packagePurchaseId: string;
  patient: { id: string; displayName: string | null };
  practitioner: { id: string; displayName: string | null };
  packageName: string;
  currency: string;
  packageNetPaid: string;
  totalSessions: number;
  usedSessions: number;
  unusedSessions: number;
  reservedSessions: number;
  standalonePriceSnapshot: string | null;
  standaloneSnapshots: string[];
  usedStandaloneValue: string | null;
  suggestedRefundAmount: string | null;
  priorRefundedAmount: string;
  maxFinalRefundAmount: string;
  futureSessionsAffected: number;
  futureSessionIds: string[];
  packageStatus: string;
  manualReviewRequired: boolean;
  manualReviewReason: string | null;
};

export type PackageRefundPreviewResponseData = { item: PackageRefundPreview };

export type FinalizePackageRefundInput = {
  finalAmount?: number;
  reason: string;
  evidenceReference?: string;
  idempotencyKey?: string;
};
