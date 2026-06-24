import { Coupon, CouponStatus } from '@prisma/client';

export const COUPON_EFFECTIVE_STATUSES = [
  'DRAFT',
  'PENDING_REVIEW',
  'APPROVED',
  'REJECTED',
  'ACTIVE',
  'EXPIRED',
  'DISABLED',
  'NOT_STARTED',
  'USAGE_LIMIT_REACHED',
] as const;

export type CouponEffectiveStatus =
  (typeof COUPON_EFFECTIVE_STATUSES)[number];

export const COUPON_EFFECTIVE_STATUS_REASONS = [
  'ENDED',
  'NOT_STARTED',
  'DISABLED',
  'USAGE_LIMIT_REACHED',
] as const;

export type CouponEffectiveStatusReason =
  (typeof COUPON_EFFECTIVE_STATUS_REASONS)[number];

export type CouponEffectiveStatusInput = Pick<
  Coupon,
  | 'status'
  | 'isActive'
  | 'startsAt'
  | 'endsAt'
  | 'usageLimitTotal'
  | 'currentUsageCount'
>;

export interface ResolvedCouponEffectiveStatus {
  effectiveStatus: CouponEffectiveStatus;
  effectiveStatusReason: CouponEffectiveStatusReason | null;
}

export function resolveCouponEffectiveStatus(
  coupon: CouponEffectiveStatusInput,
  now = Date.now(),
): ResolvedCouponEffectiveStatus {
  if (coupon.status === CouponStatus.EXPIRED) {
    return {
      effectiveStatus: CouponStatus.EXPIRED,
      effectiveStatusReason: null,
    };
  }

  if (coupon.endsAt && coupon.endsAt.getTime() <= now) {
    return {
      effectiveStatus: CouponStatus.EXPIRED,
      effectiveStatusReason: 'ENDED',
    };
  }

  if (coupon.status === CouponStatus.DISABLED || !coupon.isActive) {
    return {
      effectiveStatus: CouponStatus.DISABLED,
      effectiveStatusReason: 'DISABLED',
    };
  }

  if (coupon.startsAt && coupon.startsAt.getTime() > now) {
    return {
      effectiveStatus: 'NOT_STARTED',
      effectiveStatusReason: 'NOT_STARTED',
    };
  }

  if (
    coupon.usageLimitTotal !== null &&
    coupon.usageLimitTotal !== undefined &&
    coupon.currentUsageCount >= coupon.usageLimitTotal
  ) {
    return {
      effectiveStatus: 'USAGE_LIMIT_REACHED',
      effectiveStatusReason: 'USAGE_LIMIT_REACHED',
    };
  }

  return {
    effectiveStatus: coupon.status,
    effectiveStatusReason: null,
  };
}
