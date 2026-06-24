import { Injectable, NotFoundException } from '@nestjs/common';
import { CouponRepository } from '../repositories/coupon.repository';

@Injectable()
export class ListMyPractitionerCouponRedemptionsUseCase {
  constructor(private readonly couponRepository: CouponRepository) {}

  async execute(input: {
    userId: string;
    couponId: string;
    page: number;
    limit: number;
  }) {
    const practitioner = await this.couponRepository.findPractitionerByUserId(
      input.userId,
    );

    if (!practitioner) {
      throw new NotFoundException({
        messageKey: 'practitioners.errors.profileNotFound',
        error: 'PRACTITIONER_PROFILE_NOT_FOUND',
      });
    }

    const coupon = await this.couponRepository.findOwnedById(
      input.couponId,
      practitioner.id,
    );

    if (!coupon) {
      throw new NotFoundException({
        messageKey: 'financialRules.errors.couponNotFound',
        error: 'FINANCIAL_RULE_COUPON_NOT_FOUND',
      });
    }

    const [items, total] = await this.couponRepository.findOwnedRedemptions({
      couponId: input.couponId,
      ownerPractitionerId: practitioner.id,
      page: input.page,
      limit: input.limit,
    });

    return {
      items: items.map((item) => ({
        id: item.id,
        sessionId: item.sessionId,
        paymentId: item.paymentId,
        patientDisplayName:
          item.patient.displayName ?? item.patient.user.displayName ?? null,
        currencyCode: item.currencyCode,
        grossAmount: item.grossAmount.toString(),
        discountAmount: item.discountAmount.toString(),
        platformDiscountShare: item.platformDiscountShare.toString(),
        practitionerDiscountShare: item.practitionerDiscountShare.toString(),
        redeemedAt: item.redeemedAt.toISOString(),
        createdAt: item.createdAt.toISOString(),
      })),
      pagination: {
        page: input.page,
        limit: input.limit,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / input.limit),
      },
    };
  }
}
