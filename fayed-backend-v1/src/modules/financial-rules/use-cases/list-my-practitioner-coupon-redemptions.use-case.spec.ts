import { CouponRepository } from '../repositories/coupon.repository';
import { ListMyPractitionerCouponRedemptionsUseCase } from './list-my-practitioner-coupon-redemptions.use-case';

describe('ListMyPractitionerCouponRedemptionsUseCase', () => {
  const couponRepository = {
    findPractitionerByUserId: jest.fn(),
    findOwnedById: jest.fn(),
    findOwnedRedemptions: jest.fn(),
  } as unknown as CouponRepository;

  const useCase = new ListMyPractitionerCouponRedemptionsUseCase(
    couponRepository,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('lists only owned coupon redemptions with safe patient display name', async () => {
    (couponRepository.findPractitionerByUserId as jest.Mock).mockResolvedValue({
      id: 'practitioner-1',
    });
    (couponRepository.findOwnedById as jest.Mock).mockResolvedValue({
      id: 'coupon-1',
    });
    (couponRepository.findOwnedRedemptions as jest.Mock).mockResolvedValue([
      [
        {
          id: 'redemption-1',
          sessionId: 'session-1',
          paymentId: 'payment-1',
          currencyCode: 'EGP',
          grossAmount: { toString: () => '1000.00' },
          discountAmount: { toString: () => '100.00' },
          platformDiscountShare: { toString: () => '50.00' },
          practitionerDiscountShare: { toString: () => '50.00' },
          redeemedAt: new Date('2026-05-01T00:00:00.000Z'),
          createdAt: new Date('2026-05-01T00:00:00.000Z'),
          patient: {
            displayName: null,
            user: { displayName: 'Ahmed Patient' },
          },
        },
      ],
      1,
    ]);

    const result = await useCase.execute({
      userId: 'user-1',
      couponId: 'coupon-1',
      page: 1,
      limit: 20,
    });

    expect(result.items[0].patientDisplayName).toBe('Ahmed Patient');
    expect(result.items[0].discountAmount).toBe('100.00');
    expect(result.pagination.total).toBe(1);
  });
});
