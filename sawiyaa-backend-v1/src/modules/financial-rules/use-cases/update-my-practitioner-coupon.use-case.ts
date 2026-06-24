import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CouponStatus, SecurityAuditOutcome } from '@prisma/client';
import { SecurityAuditService } from '@common/security-audit/security-audit.service';
import { FinancialRulesMapper } from '../mappers/financial-rules.mapper';
import { CouponRepository } from '../repositories/coupon.repository';

const PRACTITIONER_COUPON_MAX_PERCENT = 25;

@Injectable()
export class UpdateMyPractitionerCouponUseCase {
  constructor(
    private readonly couponRepository: CouponRepository,
    private readonly financialRulesMapper: FinancialRulesMapper,
    private readonly securityAuditService: SecurityAuditService,
  ) {}

  async execute(input: {
    userId: string;
    couponId: string;
    payload: {
      discountValue?: string;
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

    const current = await this.couponRepository.findOwnedById(
      input.couponId,
      practitioner.id,
    );

    if (!current) {
      throw new NotFoundException({
        messageKey: 'financialRules.errors.couponNotFound',
        error: 'FINANCIAL_RULE_COUPON_NOT_FOUND',
      });
    }

    if (input.payload.discountValue !== undefined) {
      this.assertPercentageLimit(input.payload.discountValue);

      if (current.currentUsageCount > 0) {
        throw new BadRequestException({
          messageKey:
            'financialRules.errors.practitionerCouponImmutableAfterRedemption',
          error:
            'FINANCIAL_RULE_PRACTITIONER_COUPON_IMMUTABLE_AFTER_REDEMPTION',
        });
      }
    }

    if (input.payload.maxDiscountAmount !== undefined) {
      this.assertPositiveMoney(input.payload.maxDiscountAmount);
    }

    if (
      input.payload.usageLimitTotal !== undefined &&
      input.payload.usageLimitTotal < current.currentUsageCount
    ) {
      throw new BadRequestException({
        messageKey: 'financialRules.errors.couponUsageLimitBelowCurrentUsage',
        error: 'FINANCIAL_RULE_COUPON_USAGE_LIMIT_BELOW_CURRENT_USAGE',
      });
    }

    this.assertDateRange(input.payload.startsAt, input.payload.endsAt);

    const hasMutableFields = Object.values(input.payload).some(
      (value) => value !== undefined,
    );
    if (!hasMutableFields) {
      return {
        item: this.financialRulesMapper.toCoupon(current),
      };
    }

    const updated = await this.couponRepository.updateById(input.couponId, {
      discountValue:
        input.payload.discountValue !== undefined
          ? input.payload.discountValue
          : undefined,
      maxDiscountAmount:
        input.payload.maxDiscountAmount !== undefined
          ? input.payload.maxDiscountAmount
          : undefined,
      usageLimitTotal:
        input.payload.usageLimitTotal !== undefined
          ? input.payload.usageLimitTotal
          : undefined,
      usageLimitPerPatient:
        input.payload.usageLimitPerPatient !== undefined
          ? input.payload.usageLimitPerPatient
          : undefined,
      startsAt:
        input.payload.startsAt !== undefined
          ? input.payload.startsAt
          : undefined,
      endsAt:
        input.payload.endsAt !== undefined ? input.payload.endsAt : undefined,
      isActive:
        input.payload.isActive !== undefined ? input.payload.isActive : undefined,
      status:
        input.payload.isActive === undefined
          ? undefined
          : input.payload.isActive
            ? CouponStatus.ACTIVE
            : CouponStatus.DISABLED,
    });

    this.securityAuditService.logAsync({
      action: 'finance.coupons.practitioner.update.success',
      outcome: SecurityAuditOutcome.SUCCESS,
      actorUserId: input.userId,
      resourceType: 'Coupon',
      resourceId: current.id,
      targetUserId: input.userId,
      metadata: {
        practitionerId: practitioner.id,
        couponId: current.id,
        couponCode: current.code,
        changes: {
          discountValue: input.payload.discountValue ?? null,
          maxDiscountAmount: input.payload.maxDiscountAmount ?? null,
          usageLimitTotal: input.payload.usageLimitTotal ?? null,
          usageLimitPerPatient: input.payload.usageLimitPerPatient ?? null,
          startsAt: input.payload.startsAt ?? null,
          endsAt: input.payload.endsAt ?? null,
          isActive: input.payload.isActive ?? null,
        },
      },
    });

    return {
      item: this.financialRulesMapper.toCoupon(updated),
    };
  }

  private assertPercentageLimit(discountValue: string) {
    const value = Number(discountValue);
    if (!Number.isFinite(value) || value <= 0 || value > PRACTITIONER_COUPON_MAX_PERCENT) {
      throw new BadRequestException({
        messageKey: 'financialRules.errors.practitionerCouponDiscountTooHigh',
        error: 'FINANCIAL_RULE_PRACTITIONER_COUPON_DISCOUNT_TOO_HIGH',
      });
    }
  }

  private assertPositiveMoney(value: string) {
    const amount = Number(value);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException({
        messageKey: 'financialRules.errors.practitionerCouponInvalidMoney',
        error: 'FINANCIAL_RULE_PRACTITIONER_COUPON_INVALID_MONEY',
      });
    }
  }

  private assertDateRange(startsAt?: string, endsAt?: string) {
    if (!startsAt && !endsAt) {
      return;
    }

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
