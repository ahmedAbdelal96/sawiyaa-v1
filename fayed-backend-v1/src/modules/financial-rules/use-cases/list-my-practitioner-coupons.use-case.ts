import { Injectable, NotFoundException } from '@nestjs/common';
import { CouponStatus } from '@prisma/client';
import { FinancialRulesMapper } from '../mappers/financial-rules.mapper';
import { CouponRepository } from '../repositories/coupon.repository';
import { normalizeCouponCode } from '../utils/normalize-financial-identifiers.util';

@Injectable()
export class ListMyPractitionerCouponsUseCase {
  constructor(
    private readonly couponRepository: CouponRepository,
    private readonly financialRulesMapper: FinancialRulesMapper,
  ) {}

  async execute(input: {
    userId: string;
    page: number;
    limit: number;
    q?: string;
    status?: CouponStatus;
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

    const [items, total] = await this.couponRepository.listOwnedCoupons({
      practitionerId: practitioner.id,
      page: input.page,
      limit: input.limit,
      q: input.q?.trim() ? normalizeCouponCode(input.q) : null,
      status: input.status ?? null,
    });

    return {
      items: items.map((coupon) => this.financialRulesMapper.toCoupon(coupon)),
      pagination: {
        page: input.page,
        limit: input.limit,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / input.limit),
      },
    };
  }
}
