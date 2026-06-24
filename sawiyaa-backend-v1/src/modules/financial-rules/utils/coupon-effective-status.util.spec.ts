import { CouponStatus } from '@prisma/client';
import { resolveCouponEffectiveStatus } from './coupon-effective-status.util';

describe('resolveCouponEffectiveStatus', () => {
  const baseCoupon = {
    status: CouponStatus.ACTIVE,
    isActive: true,
    startsAt: null,
    endsAt: null,
    usageLimitTotal: null,
    currentUsageCount: 0,
  } as const;

  it('returns expired when the end date is in the past', () => {
    const result = resolveCouponEffectiveStatus(
      {
        ...baseCoupon,
        endsAt: new Date('2026-06-02T23:59:59.999Z'),
      },
      new Date('2026-06-03T00:00:00.000Z').getTime(),
    );

    expect(result).toEqual({
      effectiveStatus: CouponStatus.EXPIRED,
      effectiveStatusReason: 'ENDED',
    });
  });

  it('returns not started when the start date is in the future', () => {
    const result = resolveCouponEffectiveStatus(
      {
        ...baseCoupon,
        startsAt: new Date('2026-06-04T00:00:00.000Z'),
      },
      new Date('2026-06-03T00:00:00.000Z').getTime(),
    );

    expect(result).toEqual({
      effectiveStatus: 'NOT_STARTED',
      effectiveStatusReason: 'NOT_STARTED',
    });
  });

  it('returns active when no dates are set', () => {
    const result = resolveCouponEffectiveStatus(
      { ...baseCoupon },
      new Date('2026-06-03T00:00:00.000Z').getTime(),
    );

    expect(result).toEqual({
      effectiveStatus: CouponStatus.ACTIVE,
      effectiveStatusReason: null,
    });
  });

  it('keeps disabled coupons disabled even with future dates', () => {
    const result = resolveCouponEffectiveStatus(
      {
        ...baseCoupon,
        status: CouponStatus.DISABLED,
        isActive: false,
        startsAt: new Date('2026-06-10T00:00:00.000Z'),
        endsAt: new Date('2026-06-20T23:59:59.999Z'),
      },
      new Date('2026-06-03T00:00:00.000Z').getTime(),
    );

    expect(result).toEqual({
      effectiveStatus: CouponStatus.DISABLED,
      effectiveStatusReason: 'DISABLED',
    });
  });

  it('returns usage limit reached when the total limit has been met', () => {
    const result = resolveCouponEffectiveStatus(
      {
        ...baseCoupon,
        usageLimitTotal: 3,
        currentUsageCount: 3,
      },
      new Date('2026-06-03T00:00:00.000Z').getTime(),
    );

    expect(result).toEqual({
      effectiveStatus: 'USAGE_LIMIT_REACHED',
      effectiveStatusReason: 'USAGE_LIMIT_REACHED',
    });
  });

  it('keeps an end-of-day timestamp valid until the day is over', () => {
    const result = resolveCouponEffectiveStatus(
      {
        ...baseCoupon,
        endsAt: new Date('2026-06-03T23:59:59.999Z'),
      },
      new Date('2026-06-03T12:00:00.000Z').getTime(),
    );

    expect(result).toEqual({
      effectiveStatus: CouponStatus.ACTIVE,
      effectiveStatusReason: null,
    });
  });
});
