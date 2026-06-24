export type CouponScope = "PRACTITIONER_SESSIONS" | "PLATFORM_WIDE" | "SPECIALTY" | "CAMPAIGN";

export type CouponStatus =
  | "DRAFT"
  | "PENDING_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "ACTIVE"
  | "EXPIRED"
  | "DISABLED";

export type DiscountType = "PERCENTAGE" | "FIXED_AMOUNT";

export type PractitionerCoupon = {
  id: string;
  code: string;
  slug: string;
  couponScope: CouponScope;
  status: CouponStatus;
  discountType: DiscountType;
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
};

export type PractitionerCouponRedemption = {
  id: string;
  sessionId: string;
  paymentId: string;
  patientDisplayName: string | null;
  currencyCode: string;
  grossAmount: string;
  discountAmount: string;
  platformDiscountShare: string;
  practitionerDiscountShare: string;
  redeemedAt: string;
  createdAt: string;
};

export type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type ListPractitionerCouponsParams = {
  page?: number;
  limit?: number;
  q?: string;
  status?: CouponStatus;
};

export type ListPractitionerCouponRedemptionsParams = {
  page?: number;
  limit?: number;
};

export type CreatePractitionerCouponPayload = {
  code: string;
  discountType: "PERCENTAGE";
  discountValue: string;
  maxDiscountAmount?: string;
  usageLimitTotal?: number;
  usageLimitPerPatient?: number;
  startsAt?: string;
  endsAt?: string;
  isActive?: boolean;
};

export type UpdatePractitionerCouponPayload = {
  discountValue?: string;
  maxDiscountAmount?: string;
  usageLimitTotal?: number;
  usageLimitPerPatient?: number;
  startsAt?: string;
  endsAt?: string;
  isActive?: boolean;
};

export type PractitionerCouponsListResponse = {
  items: PractitionerCoupon[];
  pagination: Pagination;
};

export type PractitionerCouponResponse = {
  item: PractitionerCoupon;
};

export type PractitionerCouponRedemptionsResponse = {
  items: PractitionerCouponRedemption[];
  pagination: Pagination;
};
