import { PrismaService } from '@common/prisma/prisma.service';
import { SecurityAuditService } from '@common/security-audit/security-audit.service';
import { CouponRedemptionRepository } from '../repositories/coupon-redemption.repository';
import { CouponRepository } from '../repositories/coupon.repository';
import { MoneyMathService } from './money-math.service';
import { RedeemCouponService } from './redeem-coupon.service';

describe('RedeemCouponService', () => {
  const prisma = {
    $transaction: jest.fn().mockImplementation(async (fn) => fn({})),
  } as unknown as PrismaService;

  const couponRepository = {
    lockCouponForUpdate: jest.fn(),
    findById: jest.fn(),
    findByCode: jest.fn(),
    countPatientRedemptions: jest.fn(),
    incrementUsageCount: jest.fn(),
  } as unknown as CouponRepository;

  const couponRedemptionRepository = {
    findByCouponAndSession: jest.fn(),
    createRedemption: jest.fn(),
  } as unknown as CouponRedemptionRepository;

  const securityAuditService = {
    logAsync: jest.fn(),
  } as unknown as SecurityAuditService;

  const service = new RedeemCouponService(
    prisma as never,
    couponRepository,
    couponRedemptionRepository,
    new MoneyMathService(),
    securityAuditService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.$transaction as jest.Mock).mockImplementation(async (fn) => fn({}));
    (couponRedemptionRepository.findByCouponAndSession as jest.Mock).mockReset();
    (couponRepository.findById as jest.Mock).mockReset();
    (couponRepository.countPatientRedemptions as jest.Mock).mockReset();
    (couponRepository.incrementUsageCount as jest.Mock).mockReset();
    (couponRedemptionRepository.createRedemption as jest.Mock).mockReset();
  });

  it('returns existing redemption when already redeemed', async () => {
    (couponRedemptionRepository.findByCouponAndSession as jest.Mock).mockResolvedValue({
      id: 'redemption-1',
    });

    const result = await service.redeemFromPayment({
      couponId: 'coupon-1',
      sessionId: 'session-1',
      paymentId: 'payment-1',
      patientId: 'patient-1',
      practitionerId: 'practitioner-1',
      currencyCode: 'EGP',
      grossAmount: '1000.00',
      discountAmount: '100.00',
      couponPlatformSharePercent: '50.00',
      couponPractitionerSharePercent: '50.00',
    });

    expect(result).toEqual({ id: 'redemption-1' });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('creates a redemption and splits discount deterministically', async () => {
    (couponRedemptionRepository.findByCouponAndSession as jest.Mock)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    (couponRepository.findById as jest.Mock).mockResolvedValue({
      id: 'coupon-1',
      currentUsageCount: 0,
      usageLimitTotal: null,
      usageLimitPerPatient: null,
    });
    (couponRepository.incrementUsageCount as jest.Mock).mockResolvedValue({
      id: 'coupon-1',
    });
    (couponRedemptionRepository.createRedemption as jest.Mock).mockResolvedValue({
      id: 'redemption-1',
    });

    const result = await service.redeemFromPayment({
      couponId: 'coupon-1',
      sessionId: 'session-1',
      paymentId: 'payment-1',
      patientId: 'patient-1',
      practitionerId: 'practitioner-1',
      currencyCode: 'EGP',
      grossAmount: '1.01',
      discountAmount: '1.01',
      couponPlatformSharePercent: '50.00',
      couponPractitionerSharePercent: '50.00',
    });

    expect(couponRedemptionRepository.createRedemption).toHaveBeenCalledWith(
      expect.objectContaining({
        platformDiscountShare: '0.51',
        practitionerDiscountShare: '0.50',
      }),
      expect.anything(),
    );
    expect(result).toEqual({ id: 'redemption-1' });
    expect(securityAuditService.logAsync).toHaveBeenCalledTimes(1);
  });
});
