import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { CouponScope, CouponStatus, DiscountType } from '@prisma/client';
import { FinancialRulesMapper } from '../mappers/financial-rules.mapper';
import { CouponRepository } from '../repositories/coupon.repository';
import {
  normalizeCouponCode,
  normalizeSlug,
} from '../utils/normalize-financial-identifiers.util';

@Injectable()
export class CreateCouponUseCase {
  constructor(
    private readonly couponRepository: CouponRepository,
    private readonly financialRulesMapper: FinancialRulesMapper,
  ) {}

  async execute(input: {
    createdByUserId: string;
    code: string;
    slug: string;
    couponScope: CouponScope;
    status: CouponStatus;
    discountType: DiscountType;
    discountValue: string;
    maxDiscountAmount?: string;
    platformSharePercent: string;
    practitionerSharePercent: string;
    usageLimitTotal?: number;
    usageLimitPerPatient?: number;
    requiresApproval?: boolean;
    approvedAt?: string;
    startsAt?: string;
    endsAt?: string;
    isActive?: boolean;
    ownerPractitionerId?: string;
  }) {
    const code = normalizeCouponCode(input.code);
    const existing = await this.couponRepository.findByCode(code);

    if (existing) {
      throw new ConflictException({
        messageKey: 'financialRules.errors.couponCodeExists',
        error: 'FINANCIAL_RULE_COUPON_CODE_EXISTS',
      });
    }

    if (
      input.couponScope === CouponScope.SPECIALTY ||
      input.couponScope === CouponScope.CAMPAIGN
    ) {
      throw new BadRequestException({
        messageKey: 'financialRules.errors.couponScopeUnsupported',
        error: 'FINANCIAL_RULE_COUPON_SCOPE_UNSUPPORTED',
      });
    }

    const approvedAt = input.approvedAt ? new Date(input.approvedAt) : null;
    const startsAt = input.startsAt ? new Date(input.startsAt) : null;
    const endsAt = input.endsAt ? new Date(input.endsAt) : null;

    if (
      (approvedAt && Number.isNaN(approvedAt.getTime())) ||
      (startsAt && Number.isNaN(startsAt.getTime())) ||
      (endsAt && Number.isNaN(endsAt.getTime()))
    ) {
      throw new BadRequestException({
        messageKey: 'financialRules.errors.invalidDateRange',
        error: 'FINANCIAL_RULE_INVALID_DATE_RANGE',
      });
    }

    if (startsAt && endsAt && endsAt.getTime() <= startsAt.getTime()) {
      throw new BadRequestException({
        messageKey: 'financialRules.errors.invalidDateRange',
        error: 'FINANCIAL_RULE_INVALID_DATE_RANGE',
      });
    }

    const created = await this.couponRepository.createCoupon({
      code,
      slug: normalizeSlug(input.slug),
      createdByUserId: input.createdByUserId,
      ownerPractitionerId: input.ownerPractitionerId ?? null,
      approvedByUserId: approvedAt ? input.createdByUserId : null,
      couponScope: input.couponScope,
      status: input.status,
      discountType: input.discountType,
      discountValue: input.discountValue,
      maxDiscountAmount: input.maxDiscountAmount ?? null,
      platformSharePercent: input.platformSharePercent,
      practitionerSharePercent: input.practitionerSharePercent,
      usageLimitTotal: input.usageLimitTotal ?? null,
      usageLimitPerPatient: input.usageLimitPerPatient ?? null,
      requiresApproval: input.requiresApproval ?? true,
      approvedAt,
      startsAt,
      endsAt,
      isActive: input.isActive ?? false,
    });

    return {
      item: this.financialRulesMapper.toCoupon(created),
    };
  }
}
