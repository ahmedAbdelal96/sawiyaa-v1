import { CouponStatus } from '@prisma/client';
import { FinancialRulesMapper } from '../mappers/financial-rules.mapper';
import { CouponRepository } from '../repositories/coupon.repository';
import { ListMyPractitionerCouponsUseCase } from './list-my-practitioner-coupons.use-case';

describe('ListMyPractitionerCouponsUseCase', () => {
  const couponRepository = {
    findPractitionerByUserId: jest.fn(),
    listOwnedCoupons: jest.fn(),
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
    (couponRepository.listOwnedCoupons as jest.Mock).mockResolvedValue([
      [
        {
          id: 'coupon-1',
          code: 'DR_AHMED10',
          slug: 'dr-ahmed10',
          status: CouponStatus.ACTIVE,
        },
      ],
      1,
    ]);
    (financialRulesMapper.toCoupon as jest.Mock).mockReturnValue({
      id: 'coupon-1',
    });

    const result = await useCase.execute({
      userId: 'user-1',
      page: 1,
      limit: 20,
      q: 'dr_ahmed',
    });

    expect(couponRepository.listOwnedCoupons).toHaveBeenCalledWith({
      practitionerId: 'practitioner-1',
      page: 1,
      limit: 20,
      q: 'DR_AHMED',
      status: null,
    });
    expect(result.items).toEqual([{ id: 'coupon-1' }]);
  });
});
