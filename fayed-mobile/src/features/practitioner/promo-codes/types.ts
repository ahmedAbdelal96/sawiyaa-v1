export type PractitionerCouponStatus =
  | "DRAFT"
  | "PENDING_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "ACTIVE"
  | "EXPIRED"
  | "DISABLED";

export type PractitionerCouponEffectiveStatus =
  | PractitionerCouponStatus
  | "NOT_STARTED"
  | "USAGE_LIMIT_REACHED";

export type PractitionerCouponEffectiveStatusReason =
  | "ENDED"
  | "NOT_STARTED"
  | "DISABLED"
  | "USAGE_LIMIT_REACHED"
  | null;

export type PractitionerCouponScope =
  | "PRACTITIONER_SESSIONS"
  | "PLATFORM_WIDE"
  | "SPECIALTY"
  | "CAMPAIGN";

export type PractitionerCouponDiscountType = "PERCENTAGE";

export interface PractitionerCouponItem {
  id: string;
  code: string;
  slug: string;
  couponScope: PractitionerCouponScope;
  status: PractitionerCouponStatus;
  effectiveStatus: PractitionerCouponEffectiveStatus;
  effectiveStatusReason: PractitionerCouponEffectiveStatusReason;
  discountType: PractitionerCouponDiscountType;
  discountValue: string;
  maxDiscountAmount: string | null;
  platformSharePercent: string;
  practitionerSharePercent: string;
  usageLimitTotal: number | null;
  usageLimitPerPatient: number | null;
  currentUsageCount: number;
  requiresApproval: boolean;
  approvedAt: string | null;
  startsAt: string | null;
  endsAt: string | null;
  isActive: boolean;
  ownerPractitionerId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PractitionerCouponPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PractitionerCouponsListResponse {
  items: PractitionerCouponItem[];
  pagination: PractitionerCouponPagination;
}

export interface PractitionerCouponDetailResponse {
  item: PractitionerCouponItem;
}

export interface PractitionerCouponRedemptionItem {
  id: string;
  sessionId: string | null;
  paymentId: string | null;
  patientDisplayName: string | null;
  currencyCode: string;
  grossAmount: string;
  discountAmount: string;
  platformDiscountShare: string;
  practitionerDiscountShare: string;
  redeemedAt: string;
  createdAt: string;
}

export interface PractitionerCouponRedemptionsListResponse {
  items: PractitionerCouponRedemptionItem[];
  pagination: PractitionerCouponPagination;
}

export interface PractitionerCouponListParams {
  page?: number;
  limit?: number;
  q?: string;
  status?: PractitionerCouponStatus;
}

export interface PractitionerCouponRedemptionsListParams {
  page?: number;
  limit?: number;
}

export interface CreatePractitionerCouponRequest {
  code: string;
  discountType: PractitionerCouponDiscountType;
  discountValue: string;
  usageLimitTotal?: number;
  usageLimitPerPatient?: number;
  startsAt?: string;
  endsAt?: string;
  isActive?: boolean;
}

export interface UpdatePractitionerCouponRequest {
  discountValue?: string;
  usageLimitTotal?: number;
  usageLimitPerPatient?: number;
  startsAt?: string;
  endsAt?: string;
  isActive?: boolean;
}
