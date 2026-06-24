import { CouponRepository } from '../repositories/coupon.repository';
import { FinancialRulesMapper } from '../mappers/financial-rules.mapper';
import { SecurityAuditService } from '@common/security-audit/security-audit.service';
import { DisableMyPractitionerCouponUseCase } from './disable-my-practitioner-coupon.use-case';

describe('DisableMyPractitionerCouponUseCase', () => {
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

  const useCase = new DisableMyPractitionerCouponUseCase(
    couponRepository,
    financialRulesMapper,
    securityAuditService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('disables an owned coupon', async () => {
    (couponRepository.findPractitionerByUserId as jest.Mock).mockResolvedValue({
      id: 'practitioner-1',
    });
    (couponRepository.findOwnedById as jest.Mock).mockResolvedValue({
      id: 'coupon-1',
      code: 'DR_AHMED10',
    });
    (couponRepository.updateById as jest.Mock).mockResolvedValue({
      id: 'coupon-1',
    });
    (financialRulesMapper.toCoupon as jest.Mock).mockReturnValue({
      id: 'coupon-1',
      status: 'DISABLED',
    });

    const result = await useCase.execute({
      userId: 'user-1',
      couponId: 'coupon-1',
    });

    expect(couponRepository.updateById).toHaveBeenCalledWith('coupon-1', {
      status: 'DISABLED',
      isActive: false,
    });
    expect(result.item.status).toBe('DISABLED');
    expect(securityAuditService.logAsync).toHaveBeenCalledTimes(1);
  });
});
