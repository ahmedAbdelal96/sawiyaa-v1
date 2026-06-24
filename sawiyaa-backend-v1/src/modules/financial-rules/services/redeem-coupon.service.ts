import { Injectable } from '@nestjs/common';
import { Prisma, SecurityAuditOutcome } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { SecurityAuditService } from '@common/security-audit/security-audit.service';
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
    private readonly securityAuditService: SecurityAuditService,
  ) {}

  async redeemFromPayment(input: {
    couponId: string | null;
    couponCode?: string | null;
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
      .subtract(input.discountAmount, platformDiscountShare)
      .toFixed(2);

    const redemption = await this.prisma.$transaction(async (tx) => {
      await this.couponRepository.lockCouponForUpdate(input.couponId!, tx);

      const coupon = await this.couponRepository.findById(input.couponId!, tx);
      if (!coupon) {
        return null;
      }

      const refreshedExisting =
        await this.couponRedemptionRepository.findByCouponAndSession(
          input.couponId!,
          input.sessionId!,
          tx,
        );

      if (refreshedExisting) {
        return refreshedExisting;
      }

      const currentUsageCount = coupon.currentUsageCount;
      if (
        coupon.usageLimitTotal !== null &&
        coupon.usageLimitTotal !== undefined &&
        currentUsageCount >= coupon.usageLimitTotal
      ) {
        return null;
      }

      if (
        coupon.usageLimitPerPatient !== null &&
        coupon.usageLimitPerPatient !== undefined
      ) {
        const patientUsage =
          await this.couponRepository.countPatientRedemptions(
            coupon.id,
            input.patientId,
            tx,
          );

        if (patientUsage >= coupon.usageLimitPerPatient) {
          return null;
        }
      }

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

      const updated = await this.couponRepository.incrementUsageCount(
        input.couponId!,
        tx,
      );
      if (!updated) {
        throw new Error('COUPON_USAGE_INCREMENT_FAILED');
      }

      return redemption;
    });

    if (redemption) {
      this.securityAuditService.logAsync({
        action: 'finance.coupons.redeemed.success',
        outcome: SecurityAuditOutcome.SUCCESS,
        resourceType: 'Coupon',
        resourceId: input.couponId,
        metadata: {
          couponId: input.couponId,
          couponCode: input.couponCode ?? null,
          sessionId: input.sessionId,
          paymentId: input.paymentId,
          practitionerId: input.practitionerId,
          patientId: input.patientId,
          currencyCode: input.currencyCode,
          grossAmount: input.grossAmount,
          discountAmount: input.discountAmount,
          platformDiscountShare,
          practitionerDiscountShare,
        },
      });
    }

    return redemption;
  }

  private isZero(value: string) {
    return this.moneyMathService.toDecimal(value).equals(0);
  }
}
