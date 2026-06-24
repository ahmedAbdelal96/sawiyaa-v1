import { BadRequestException } from '@nestjs/common';
import { CouponRepository } from '../repositories/coupon.repository';
import { FinancialRulesMapper } from '../mappers/financial-rules.mapper';
import { SecurityAuditService } from '@common/security-audit/security-audit.service';
import { UpdateMyPractitionerCouponUseCase } from './update-my-practitioner-coupon.use-case';

describe('UpdateMyPractitionerCouponUseCase', () => {
  const couponRepository = {
    findPractitionerByUserId: jest.fn(),
    findOwnedById: jest.fn(),
    updateById: jest.fn(),
  } as unknown as CouponRepository;

  const financialRulesMapper = {
    toCoupon: jest.fn(),
  } as unknown as FinancialRulesMapper;

  const securityAuditService = {
    logAsync: jest.fn(),
  } as unknown as SecurityAuditService;

  const useCase = new UpdateMyPractitionerCouponUseCase(
    couponRepository,
    financialRulesMapper,
    securityAuditService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('updates an owned coupon and emits audit', async () => {
    (couponRepository.findPractitionerByUserId as jest.Mock).mockResolvedValue({
      id: 'practitioner-1',
    });
    (couponRepository.findOwnedById as jest.Mock).mockResolvedValue({
      id: 'coupon-1',
      code: 'DR_AHMED10',
      currentUsageCount: 0,
    });
    (couponRepository.updateById as jest.Mock).mockResolvedValue({
      id: 'coupon-1',
    });
    (financialRulesMapper.toCoupon as jest.Mock).mockReturnValue({
      id: 'coupon-1',
    });

    const result = await useCase.execute({
      userId: 'user-1',
      couponId: 'coupon-1',
      payload: {
        discountValue: '12.00',
        maxDiscountAmount: '100.00',
        usageLimitTotal: 25,
        usageLimitPerPatient: 3,
        isActive: true,
      },
    });

    expect(couponRepository.updateById).toHaveBeenCalledWith(
      'coupon-1',
      expect.objectContaining({
        discountValue: '12.00',
        maxDiscountAmount: '100.00',
        usageLimitTotal: 25,
        usageLimitPerPatient: 3,
        isActive: true,
      }),
    );
    expect(result.item).toEqual({ id: 'coupon-1' });
    expect(securityAuditService.logAsync).toHaveBeenCalledTimes(1);
  });

  it('blocks discount changes after redemption', async () => {
    (couponRepository.findPractitionerByUserId as jest.Mock).mockResolvedValue({
      id: 'practitioner-1',
    });
    (couponRepository.findOwnedById as jest.Mock).mockResolvedValue({
      id: 'coupon-1',
      code: 'DR_AHMED10',
      currentUsageCount: 1,
    });

    await expect(
      useCase.execute({
        userId: 'user-1',
        couponId: 'coupon-1',
        payload: {
          discountValue: '15.00',
        },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
