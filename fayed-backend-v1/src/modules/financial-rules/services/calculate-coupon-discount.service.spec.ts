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

  it('splits practitioner coupon discounts deterministically', () => {
    const result = service.calculate({
      grossAmount: '1000.00',
      coupon: {
        id: 'coupon-id',
        code: 'DR_AHMED10',
        slug: 'dr-ahmed10',
        createdByUserId: 'practitioner-user-id',
        ownerPractitionerId: 'practitioner-id',
        approvedByUserId: null,
        couponScope: CouponScope.PRACTITIONER_SESSIONS,
        status: CouponStatus.ACTIVE,
        discountType: DiscountType.PERCENTAGE,
        discountValue: new Prisma.Decimal('10.00'),
        maxDiscountAmount: null,
        platformSharePercent: new Prisma.Decimal('50.00'),
        practitionerSharePercent: new Prisma.Decimal('50.00'),
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

    expect(result.discountAmount).toBe('100.00');
    expect(result.platformDiscountShareAmount).toBe('50.00');
    expect(result.practitionerDiscountShareAmount).toBe('50.00');
  });

  it('splits odd minor-unit discounts without drift', () => {
    const result = service.calculate({
      grossAmount: '1.01',
      coupon: {
        id: 'coupon-id',
        code: 'DR_AHMED10',
        slug: 'dr-ahmed10',
        createdByUserId: 'practitioner-user-id',
        ownerPractitionerId: 'practitioner-id',
        approvedByUserId: null,
        couponScope: CouponScope.PRACTITIONER_SESSIONS,
        status: CouponStatus.ACTIVE,
        discountType: DiscountType.PERCENTAGE,
        discountValue: new Prisma.Decimal('100.00'),
        maxDiscountAmount: null,
        platformSharePercent: new Prisma.Decimal('50.00'),
        practitionerSharePercent: new Prisma.Decimal('50.00'),
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

    expect(result.discountAmount).toBe('1.01');
    expect(result.platformDiscountShareAmount).toBe('0.51');
    expect(result.practitionerDiscountShareAmount).toBe('0.50');
  });
});
