import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CouponScope, CouponStatus, DiscountType, SecurityAuditOutcome } from '@prisma/client';
import { SecurityAuditService } from '@common/security-audit/security-audit.service';
import { CouponRepository } from '../repositories/coupon.repository';
import { CreateCouponUseCase } from './create-coupon.use-case';
import { normalizeCouponCode, normalizeSlug } from '../utils/normalize-financial-identifiers.util';

const PRACTITIONER_COUPON_CODE_PATTERN = /^[A-Z0-9_-]+$/;

@Injectable()
export class CreateMyPractitionerCouponUseCase {
  constructor(
    private readonly couponRepository: CouponRepository,
    private readonly createCouponUseCase: CreateCouponUseCase,
    private readonly securityAuditService: SecurityAuditService,
  ) {}

  async execute(input: {
    userId: string;
    payload: {
      code: string;
      discountType: DiscountType;
      discountValue: string;
      maxDiscountAmount?: string;
      usageLimitTotal?: number;
      usageLimitPerPatient?: number;
      startsAt?: string;
      endsAt?: string;
      isActive?: boolean;
    };
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

    const normalizedCode = normalizeCouponCode(input.payload.code);
    if (!PRACTITIONER_COUPON_CODE_PATTERN.test(normalizedCode)) {
      throw new BadRequestException({
        messageKey: 'financialRules.errors.couponCodeInvalid',
        error: 'FINANCIAL_RULE_COUPON_CODE_INVALID',
      });
    }

    if (input.payload.discountType !== DiscountType.PERCENTAGE) {
      throw new BadRequestException({
        messageKey: 'financialRules.errors.practitionerCouponPercentageOnly',
        error: 'FINANCIAL_RULE_PRACTITIONER_COUPON_PERCENTAGE_ONLY',
      });
    }

    this.assertPercentageLimit(input.payload.discountValue);
    this.assertOptionalMoney(input.payload.maxDiscountAmount);
    this.assertDateRange(input.payload.startsAt, input.payload.endsAt);

    const slug = await this.buildUniqueSlug(normalizedCode);

    const created = await this.createCouponUseCase.execute({
      createdByUserId: input.userId,
      code: normalizedCode,
      slug,
      couponScope: CouponScope.PRACTITIONER_SESSIONS,
      status:
        input.payload.isActive === false
          ? CouponStatus.DISABLED
          : CouponStatus.ACTIVE,
      discountType: DiscountType.PERCENTAGE,
      discountValue: input.payload.discountValue,
      maxDiscountAmount: input.payload.maxDiscountAmount,
      platformSharePercent: '50.00',
      practitionerSharePercent: '50.00',
      usageLimitTotal: input.payload.usageLimitTotal,
      usageLimitPerPatient: input.payload.usageLimitPerPatient,
      requiresApproval: false,
      approvedAt: undefined,
      startsAt: input.payload.startsAt,
      endsAt: input.payload.endsAt,
      isActive: input.payload.isActive ?? true,
      ownerPractitionerId: practitioner.id,
    });

    this.securityAuditService.logAsync({
      action: 'finance.coupons.practitioner.create.success',
      outcome: SecurityAuditOutcome.SUCCESS,
      actorUserId: input.userId,
      resourceType: 'Coupon',
      resourceId: created.item.id,
      targetUserId: input.userId,
      metadata: {
        practitionerId: practitioner.id,
        couponId: created.item.id,
        couponCode: created.item.code,
        couponScope: created.item.couponScope,
        discountType: created.item.discountType,
        discountValue: created.item.discountValue,
        usageLimitTotal: created.item.usageLimitTotal,
        usageLimitPerPatient: created.item.usageLimitPerPatient,
      },
    });

    return {
      item: created.item,
    };
  }

  private async buildUniqueSlug(code: string) {
    const baseSlug = normalizeSlug(code);
    const existingBase = await this.couponRepository.findBySlug(baseSlug);

    if (!existingBase) {
      return baseSlug;
    }

    for (let suffix = 2; suffix < 1000; suffix += 1) {
      const candidate = `${baseSlug}-${suffix}`;
      const existingCandidate = await this.couponRepository.findBySlug(candidate);

      if (!existingCandidate) {
        return candidate;
      }
    }

    throw new BadRequestException({
      messageKey: 'financialRules.errors.couponSlugExists',
      error: 'FINANCIAL_RULE_COUPON_SLUG_EXISTS',
    });
  }

  private assertPercentageLimit(discountValue: string) {
    const value = Number(discountValue);
    if (!Number.isFinite(value) || value <= 0 || value > 20) {
      throw new BadRequestException({
        messageKey: 'financialRules.errors.practitionerCouponDiscountTooHigh',
        error: 'FINANCIAL_RULE_PRACTITIONER_COUPON_DISCOUNT_TOO_HIGH',
      });
    }
  }

  private assertOptionalMoney(value?: string) {
    if (!value) {
      return;
    }

    const amount = Number(value);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException({
        messageKey: 'financialRules.errors.practitionerCouponInvalidMoney',
        error: 'FINANCIAL_RULE_PRACTITIONER_COUPON_INVALID_MONEY',
      });
    }
  }

  private assertDateRange(startsAt?: string, endsAt?: string) {
    const parsedStartsAt = startsAt ? new Date(startsAt) : null;
    const parsedEndsAt = endsAt ? new Date(endsAt) : null;

    if (
      (parsedStartsAt && Number.isNaN(parsedStartsAt.getTime())) ||
      (parsedEndsAt && Number.isNaN(parsedEndsAt.getTime()))
    ) {
      throw new BadRequestException({
        messageKey: 'financialRules.errors.invalidDateRange',
        error: 'FINANCIAL_RULE_INVALID_DATE_RANGE',
      });
    }

    if (
      parsedStartsAt &&
      parsedEndsAt &&
      parsedEndsAt.getTime() <= parsedStartsAt.getTime()
    ) {
      throw new BadRequestException({
        messageKey: 'financialRules.errors.invalidDateRange',
        error: 'FINANCIAL_RULE_INVALID_DATE_RANGE',
      });
    }
  }
}
