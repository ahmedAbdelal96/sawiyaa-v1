import {
  CommissionRuleScope,
  CouponScope,
  CouponStatus,
  DiscountType,
  MarketType,
  PaymentPurpose,
  SessionFlowType,
  SessionMode,
} from '@prisma/client';

export type SessionFinancialContext = {
  id: string;
  flowType: SessionFlowType;
  sessionMode: SessionMode;
  durationMinutes: number;
  practitioner: {
    id: string;
    publicSlug: string;
    sessionPrice30?: { toString(): string } | string | null;
    sessionPrice60?: { toString(): string } | string | null;
    sessionPrice30Egp?: { toString(): string } | string | null;
    sessionPrice30Usd?: { toString(): string } | string | null;
    sessionPrice60Egp?: { toString(): string } | string | null;
    sessionPrice60Usd?: { toString(): string } | string | null;
    countryId: string | null;
    country: {
      currencyCode: string | null;
    } | null;
    specialties: Array<{
      specialtyId: string;
      isPrimary: boolean;
    }>;
  };
  patient: {
    id: string;
    countryId: string | null;
  };
  payments?: Array<{
    amountSubtotal: { toString(): string } | string;
  }>;
};

export type ResolvedCommissionRuleViewModel = {
  id: string;
  slug: string;
  ruleName: string;
  ruleScope: CommissionRuleScope;
  marketType: MarketType;
  platformRatePercent: string;
  practitionerRatePercent: string;
  priority: number;
  isDefault: boolean;
  isActive: boolean;
  practitionerCountryId: string | null;
  patientCountryId: string | null;
  sessionFlowType: SessionFlowType | null;
  sessionMode: SessionMode | null;
  specialtyId: string | null;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ResolvedCouponViewModel = {
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

export type SessionFinancialBreakdownViewModel = {
  sessionId: string;
  paymentPurpose: PaymentPurpose;
  currency: string;
  grossAmount: string;
  discountAmount: string;
  netPaidAmount: string;
  platformCommissionAmount: string;
  practitionerShareAmount: string;
  commissionRule: {
    id: string;
    slug: string;
    platformRatePercent: string;
    practitionerRatePercent: string;
  };
  coupon: {
    id: string;
    code: string;
    discountAmount: string;
    platformDiscountShareAmount: string;
    practitionerDiscountShareAmount: string;
    platformSharePercent: string;
    practitionerSharePercent: string;
  } | null;
};

export type PaymentFinancialResolution = {
  paymentPurpose: PaymentPurpose;
  marketType: MarketType;
  amountSubtotal: string;
  amountDiscount: string;
  amountTotal: string;
  currencyCode: string;
  commissionRuleId: string | null;
  commissionPlatformRatePercent: string | null;
  commissionPractitionerRatePercent: string | null;
  couponId: string | null;
  couponCodeSnapshot: string | null;
  couponDiscountSnapshot: string | null;
  couponPlatformSharePercent: string | null;
  couponPractitionerSharePercent: string | null;
  breakdown: SessionFinancialBreakdownViewModel;
};
