import { BadRequestException } from '@nestjs/common';
import {
  CouponScope,
  CouponStatus,
  DiscountType,
  Prisma,
  SessionFlowType,
  SessionMode,
} from '@prisma/client';
import { CouponRepository } from '../repositories/coupon.repository';
import { MoneyMathService } from './money-math.service';
import { ValidateCouponEligibilityService } from './validate-coupon-eligibility.service';

describe('ValidateCouponEligibilityService', () => {
  const couponRepository = {
    countPatientRedemptions: jest.fn(),
  } as unknown as CouponRepository;

  const service = new ValidateCouponEligibilityService(
    couponRepository,
    new MoneyMathService(),
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const buildCoupon = (ownerPractitionerId: string) => ({
    id: 'coupon-1',
    code: 'DR_AHMED10',
    slug: 'dr-ahmed10',
    createdByUserId: 'practitioner-user-id',
    ownerPractitionerId,
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
  });

  it('allows a coupon for the owning practitioner session', async () => {
    (couponRepository.countPatientRedemptions as jest.Mock).mockResolvedValue(0);

    await expect(
      service.validateForSession({
        coupon: buildCoupon('practitioner-1'),
        session: {
          id: 'session-1',
          flowType: SessionFlowType.SCHEDULED,
          sessionMode: SessionMode.VIDEO,
          durationMinutes: 30,
          practitioner: {
            id: 'practitioner-1',
            publicSlug: 'dr-ahmed',
            countryId: null,
            country: null,
            specialties: [],
          },
          patient: {
            id: 'patient-1',
            countryId: null,
            country: null,
          },
        },
      }),
    ).resolves.toMatchObject({ id: 'coupon-1' });
  });

  it('rejects coupons for another practitioner session', async () => {
    (couponRepository.countPatientRedemptions as jest.Mock).mockResolvedValue(0);

    await expect(
      service.validateForSession({
        coupon: buildCoupon('practitioner-2'),
        session: {
          id: 'session-1',
          flowType: SessionFlowType.SCHEDULED,
          sessionMode: SessionMode.VIDEO,
          durationMinutes: 30,
          practitioner: {
            id: 'practitioner-1',
            publicSlug: 'dr-ahmed',
            countryId: null,
            country: null,
            specialties: [],
          },
          patient: {
            id: 'patient-1',
            countryId: null,
            country: null,
          },
        },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
