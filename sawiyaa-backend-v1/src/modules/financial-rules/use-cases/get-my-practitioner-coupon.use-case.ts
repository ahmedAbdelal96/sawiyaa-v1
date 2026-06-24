import { Injectable, NotFoundException } from '@nestjs/common';
import { FinancialRulesMapper } from '../mappers/financial-rules.mapper';
import { CouponRepository } from '../repositories/coupon.repository';

@Injectable()
export class GetMyPractitionerCouponUseCase {
  constructor(
    private readonly couponRepository: CouponRepository,
    private readonly financialRulesMapper: FinancialRulesMapper,
  ) {}

  async execute(input: { userId: string; couponId: string }) {
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

    return {
      item: this.financialRulesMapper.toCoupon(coupon),
    };
  }
}
