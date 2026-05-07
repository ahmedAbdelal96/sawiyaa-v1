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
