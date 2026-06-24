import { CouponStatus } from '@prisma/client';
import { FinancialRulesMapper } from '../mappers/financial-rules.mapper';
import { CouponRepository } from '../repositories/coupon.repository';
import { ListMyPractitionerCouponsUseCase } from './list-my-practitioner-coupons.use-case';

describe('ListMyPractitionerCouponsUseCase', () => {
  const couponRepository = {
    findPractitionerByUserId: jest.fn(),
    listOwnedCouponsRaw: jest.fn(),
  } as unknown as CouponRepository;

  const financialRulesMapper = {
    toCoupon: jest.fn(),
  } as unknown as FinancialRulesMapper;

  const useCase = new ListMyPractitionerCouponsUseCase(
    couponRepository,
    financialRulesMapper,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('lists only owned coupons', async () => {
    (couponRepository.findPractitionerByUserId as jest.Mock).mockResolvedValue({
      id: 'practitioner-1',
    });
    (couponRepository.listOwnedCouponsRaw as jest.Mock).mockResolvedValue([
      {
        id: 'coupon-1',
        code: 'DR_AHMED10',
        slug: 'dr-ahmed10',
        status: CouponStatus.ACTIVE,
        isActive: true,
        startsAt: null,
        endsAt: null,
        usageLimitTotal: null,
        currentUsageCount: 0,
      },
    ]);
    (financialRulesMapper.toCoupon as jest.Mock).mockImplementation(
      (coupon, resolvedStatus) => ({
        id: coupon.id,
        effectiveStatus: resolvedStatus.effectiveStatus,
      }),
    );

    const result = await useCase.execute({
      userId: 'user-1',
      page: 1,
      limit: 20,
      q: 'dr_ahmed',
    });

    expect(couponRepository.listOwnedCouponsRaw).toHaveBeenCalledWith({
      practitionerId: 'practitioner-1',
      q: 'DR_AHMED',
    });
    expect(result.items).toEqual([
      { id: 'coupon-1', effectiveStatus: 'ACTIVE' },
    ]);
  });

  it('filters coupons by computed expired status', async () => {
    (couponRepository.findPractitionerByUserId as jest.Mock).mockResolvedValue({
      id: 'practitioner-1',
    });
    (couponRepository.listOwnedCouponsRaw as jest.Mock).mockResolvedValue([
      {
        id: 'coupon-1',
        code: 'DR_AHMED10',
        slug: 'dr-ahmed10',
        status: CouponStatus.ACTIVE,
        isActive: true,
        startsAt: null,
        endsAt: new Date('2026-06-02T23:59:59.999Z'),
        usageLimitTotal: null,
        currentUsageCount: 0,
      },
    ]);
    (financialRulesMapper.toCoupon as jest.Mock).mockImplementation(
      (coupon, resolvedStatus) => ({
        id: coupon.id,
        effectiveStatus: resolvedStatus.effectiveStatus,
      }),
    );

    const result = await useCase.execute({
      userId: 'user-1',
      page: 1,
      limit: 20,
      q: 'dr_ahmed',
      status: CouponStatus.EXPIRED,
    });

    expect(couponRepository.listOwnedCouponsRaw).toHaveBeenCalledWith({
      practitionerId: 'practitioner-1',
      q: 'DR_AHMED',
    });
    expect(result.items).toEqual([
      { id: 'coupon-1', effectiveStatus: 'EXPIRED' },
    ]);
    expect(result.pagination.total).toBe(1);
  });
});
