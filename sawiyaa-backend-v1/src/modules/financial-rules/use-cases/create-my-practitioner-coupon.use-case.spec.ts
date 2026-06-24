import { BadRequestException } from '@nestjs/common';
import { CouponScope, CouponStatus, DiscountType } from '@prisma/client';
import { CreateCouponUseCase } from './create-coupon.use-case';
import { CreateMyPractitionerCouponUseCase } from './create-my-practitioner-coupon.use-case';
import { CouponRepository } from '../repositories/coupon.repository';
import { SecurityAuditService } from '@common/security-audit/security-audit.service';

describe('CreateMyPractitionerCouponUseCase', () => {
  const couponRepository = {
    findPractitionerByUserId: jest.fn(),
    findBySlug: jest.fn(),
  } as unknown as CouponRepository;

  const createCouponUseCase = {
    execute: jest.fn(),
  } as unknown as CreateCouponUseCase;

  const securityAuditService = {
    logAsync: jest.fn(),
  } as unknown as SecurityAuditService;

  const useCase = new CreateMyPractitionerCouponUseCase(
    couponRepository,
    createCouponUseCase,
    securityAuditService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    (couponRepository.findBySlug as jest.Mock).mockResolvedValue(null);
  });

  it('creates a practitioner-owned percentage coupon with 50/50 split', async () => {
    (couponRepository.findPractitionerByUserId as jest.Mock).mockResolvedValue({
      id: 'practitioner-1',
      userId: 'user-1',
      status: 'APPROVED',
    });
    (createCouponUseCase.execute as jest.Mock).mockResolvedValue({
      item: {
        id: 'coupon-1',
        code: 'DR_AHMED20',
        slug: 'dr-ahmed20',
        couponScope: CouponScope.PRACTITIONER_SESSIONS,
        status: CouponStatus.ACTIVE,
        discountType: DiscountType.PERCENTAGE,
        discountValue: '20.00',
        maxDiscountAmount: null,
        platformSharePercent: '50.00',
        practitionerSharePercent: '50.00',
        usageLimitTotal: null,
        usageLimitPerPatient: null,
        currentUsageCount: 0,
        requiresApproval: false,
        approvedAt: null,
        startsAt: null,
        endsAt: null,
        isActive: true,
        ownerPractitionerId: 'practitioner-1',
        createdAt: '2026-05-01T00:00:00.000Z',
        updatedAt: '2026-05-01T00:00:00.000Z',
      },
    });

    const result = await useCase.execute({
      userId: 'user-1',
      payload: {
        code: 'dr_ahmed20',
        discountType: DiscountType.PERCENTAGE,
        discountValue: '20.00',
        isActive: true,
      },
    });

    expect(createCouponUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'DR_AHMED20',
        slug: 'dr-ahmed20',
        couponScope: CouponScope.PRACTITIONER_SESSIONS,
        status: CouponStatus.ACTIVE,
        platformSharePercent: '50.00',
        practitionerSharePercent: '50.00',
        ownerPractitionerId: 'practitioner-1',
        requiresApproval: false,
      }),
    );
    expect(result.item.code).toBe('DR_AHMED20');
    expect(securityAuditService.logAsync).toHaveBeenCalledTimes(1);
  });

  it('generates a unique slug when the normalized code slug already exists', async () => {
    (couponRepository.findPractitionerByUserId as jest.Mock).mockResolvedValue({
      id: 'practitioner-1',
      userId: 'user-1',
      status: 'APPROVED',
    });
    (couponRepository.findBySlug as jest.Mock)
      .mockResolvedValueOnce({ id: 'existing-1' })
      .mockResolvedValueOnce(null);
    (createCouponUseCase.execute as jest.Mock).mockResolvedValue({
      item: {
        id: 'coupon-1',
        code: 'DR_AHMED20',
        slug: 'dr-ahmed20-2',
        couponScope: CouponScope.PRACTITIONER_SESSIONS,
        status: CouponStatus.ACTIVE,
        discountType: DiscountType.PERCENTAGE,
        discountValue: '20.00',
        maxDiscountAmount: null,
        platformSharePercent: '50.00',
        practitionerSharePercent: '50.00',
        usageLimitTotal: null,
        usageLimitPerPatient: null,
        currentUsageCount: 0,
        requiresApproval: false,
        approvedAt: null,
        startsAt: null,
        endsAt: null,
        isActive: true,
        ownerPractitionerId: 'practitioner-1',
        createdAt: '2026-05-01T00:00:00.000Z',
        updatedAt: '2026-05-01T00:00:00.000Z',
      },
    });

    const result = await useCase.execute({
      userId: 'user-1',
      payload: {
        code: 'dr_ahmed20',
        discountType: DiscountType.PERCENTAGE,
        discountValue: '20.00',
        isActive: true,
      },
    });

    expect(couponRepository.findBySlug).toHaveBeenCalledWith('dr-ahmed20');
    expect(couponRepository.findBySlug).toHaveBeenCalledWith('dr-ahmed20-2');
    expect(createCouponUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        slug: 'dr-ahmed20-2',
      }),
    );
    expect(result.item.slug).toBe('dr-ahmed20-2');
  });

  it('rejects discounts above 25%', async () => {
    (couponRepository.findPractitionerByUserId as jest.Mock).mockResolvedValue({
      id: 'practitioner-1',
      userId: 'user-1',
      status: 'APPROVED',
    });

    await expect(
      useCase.execute({
        userId: 'user-1',
        payload: {
          code: 'DR_AHMED25',
          discountType: DiscountType.PERCENTAGE,
          discountValue: '26.00',
        },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects non-percentage discounts', async () => {
    (couponRepository.findPractitionerByUserId as jest.Mock).mockResolvedValue({
      id: 'practitioner-1',
      userId: 'user-1',
      status: 'APPROVED',
    });

    await expect(
      useCase.execute({
        userId: 'user-1',
        payload: {
          code: 'DR_AHMED10',
          discountType: DiscountType.FIXED_AMOUNT,
          discountValue: '100.00',
        },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects unsafe coupon codes', async () => {
    (couponRepository.findPractitionerByUserId as jest.Mock).mockResolvedValue({
      id: 'practitioner-1',
      userId: 'user-1',
      status: 'APPROVED',
    });

    await expect(
      useCase.execute({
        userId: 'user-1',
        payload: {
          code: 'DR AHMED 20',
          discountType: DiscountType.PERCENTAGE,
          discountValue: '10.00',
        },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
