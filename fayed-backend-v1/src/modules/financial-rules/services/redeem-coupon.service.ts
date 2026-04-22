import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { CouponRedemptionRepository } from '../repositories/coupon-redemption.repository';
import { CouponRepository } from '../repositories/coupon.repository';
import { MoneyMathService } from './money-math.service';

/**
 * Coupon redemption is intentionally executed only after a successful payment
 * so usage counters reflect real paid usage instead of abandoned attempts.
 */
@Injectable()
export class RedeemCouponService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly couponRepository: CouponRepository,
    private readonly couponRedemptionRepository: CouponRedemptionRepository,
    private readonly moneyMathService: MoneyMathService,
  ) {}

  async redeemFromPayment(input: {
    couponId: string | null;
    sessionId: string | null;
    paymentId: string;
    patientId: string;
    practitionerId: string | null;
    currencyCode: string;
    grossAmount: string;
    discountAmount: string;
    couponPlatformSharePercent: string | null;
    couponPractitionerSharePercent: string | null;
  }) {
    if (
      !input.couponId ||
      !input.sessionId ||
      this.isZero(input.discountAmount)
    ) {
      return null;
    }

    const existing =
      await this.couponRedemptionRepository.findByCouponAndSession(
        input.couponId,
        input.sessionId,
      );

    if (existing) {
      return existing;
    }

    const platformDiscountShare = this.moneyMathService
      .percentOf(input.discountAmount, input.couponPlatformSharePercent ?? '0')
      .toFixed(2);
    const practitionerDiscountShare = this.moneyMathService
      .percentOf(
        input.discountAmount,
        input.couponPractitionerSharePercent ?? '0',
      )
      .toFixed(2);

    return this.prisma.$transaction(async (tx) => {
      const redemption = await this.couponRedemptionRepository.createRedemption(
        {
          couponId: input.couponId!,
          sessionId: input.sessionId!,
          paymentId: input.paymentId,
          patientId: input.patientId,
          practitionerId: input.practitionerId,
          currencyCode: input.currencyCode,
          grossAmount: input.grossAmount,
          discountAmount: input.discountAmount,
          platformDiscountShare: platformDiscountShare,
          practitionerDiscountShare: practitionerDiscountShare,
        },
        tx,
      );

      await this.couponRepository.incrementUsageCount(input.couponId!, tx);

      return redemption;
    });
  }

  private isZero(value: string) {
    return this.moneyMathService.toDecimal(value).equals(0);
  }
}
