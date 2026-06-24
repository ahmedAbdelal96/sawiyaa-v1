import { Injectable, NotFoundException } from '@nestjs/common';
import { CouponStatus } from '@prisma/client';
import { FinancialRulesMapper } from '../mappers/financial-rules.mapper';
import { CouponRepository } from '../repositories/coupon.repository';
import { normalizeCouponCode } from '../utils/normalize-financial-identifiers.util';
import { resolveCouponEffectiveStatus } from '../utils/coupon-effective-status.util';

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

    const items = await this.couponRepository.listOwnedCouponsRaw({
      practitionerId: practitioner.id,
      q: input.q?.trim() ? normalizeCouponCode(input.q) : null,
    });

    const resolvedItems = items
      .map((coupon) => ({
        coupon,
        resolvedStatus: resolveCouponEffectiveStatus(coupon),
      }))
      .filter((item) =>
        input.status ? item.resolvedStatus.effectiveStatus === input.status : true,
      );

    const totalItems = resolvedItems.length;
    const skip = (input.page - 1) * input.limit;
    const pagedItems = resolvedItems.slice(skip, skip + input.limit);

    return {
      items: pagedItems.map(({ coupon, resolvedStatus }) =>
        this.financialRulesMapper.toCoupon(coupon, resolvedStatus),
      ),
      pagination: {
        page: input.page,
        limit: input.limit,
        total: totalItems,
        totalPages: totalItems === 0 ? 0 : Math.ceil(totalItems / input.limit),
      },
    };
  }
}
