import {
  CouponScope,
  CouponStatus,
  DiscountType,
  Prisma,
} from '@prisma/client';
import { CalculateCouponDiscountService } from './calculate-coupon-discount.service';
import { MoneyMathService } from './money-math.service';

describe('CalculateCouponDiscountService', () => {
  const service = new CalculateCouponDiscountService(new MoneyMathService());

  it('caps percentage discounts by maxDiscountAmount', () => {
    const result = service.calculate({
      grossAmount: '1000.00',
      coupon: {
        id: 'coupon-id',
        code: 'WELCOME10',
        slug: 'welcome-10',
        createdByUserId: 'admin-id',
        ownerPractitionerId: null,
        approvedByUserId: null,
        couponScope: CouponScope.PLATFORM_WIDE,
        status: CouponStatus.ACTIVE,
        discountType: DiscountType.PERCENTAGE,
        discountValue: new Prisma.Decimal('20.00'),
        maxDiscountAmount: new Prisma.Decimal('150.00'),
        platformSharePercent: new Prisma.Decimal('100.00'),
        practitionerSharePercent: new Prisma.Decimal('0.00'),
        usageLimitTotal: null,
        usageLimitPerPatient: null,
        currentUsageCount: 0,
        requiresApproval: false,
        approvedAt: null,
        startsAt: null,
        endsAt: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    expect(result.discountAmount).toBe('150.00');
    expect(result.platformDiscountShareAmount).toBe('150.00');
    expect(result.practitionerDiscountShareAmount).toBe('0.00');
  });
});
