import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Coupon, CouponScope, CouponStatus, Prisma } from '@prisma/client';
import { CouponRepository } from '../repositories/coupon.repository';
import { MoneyMathService } from './money-math.service';
import { SessionFinancialContext } from '../types/financial-rules.types';

/**
 * Coupon validation stays separate from payment collection so discounts remain
 * deterministic and explainable before any provider call or ledger posting.
 */
@Injectable()
export class ValidateCouponEligibilityService {
  constructor(
    private readonly couponRepository: CouponRepository,
    private readonly moneyMathService: MoneyMathService,
  ) {}

  async validateForSession(input: {
    coupon: Coupon | null;
    session: SessionFinancialContext;
  }) {
    const coupon = input.coupon;

    if (!coupon) {
      throw new NotFoundException({
        messageKey: 'financialRules.errors.couponNotFound',
        error: 'FINANCIAL_RULE_COUPON_NOT_FOUND',
      });
    }

    if (!coupon.isActive || coupon.status !== CouponStatus.ACTIVE) {
      throw new BadRequestException({
        messageKey: 'financialRules.errors.couponNotActive',
        error: 'FINANCIAL_RULE_COUPON_NOT_ACTIVE',
      });
    }

    if (coupon.requiresApproval && !coupon.approvedAt) {
      throw new BadRequestException({
        messageKey: 'financialRules.errors.couponApprovalRequired',
        error: 'FINANCIAL_RULE_COUPON_APPROVAL_REQUIRED',
      });
    }

    if (coupon.startsAt && coupon.startsAt.getTime() > Date.now()) {
      throw new BadRequestException({
        messageKey: 'financialRules.errors.couponNotStarted',
        error: 'FINANCIAL_RULE_COUPON_NOT_STARTED',
      });
    }

    if (coupon.endsAt && coupon.endsAt.getTime() <= Date.now()) {
      throw new BadRequestException({
        messageKey: 'financialRules.errors.couponExpired',
        error: 'FINANCIAL_RULE_COUPON_EXPIRED',
      });
    }

    if (
      coupon.usageLimitTotal !== null &&
      coupon.usageLimitTotal !== undefined &&
      coupon.currentUsageCount >= coupon.usageLimitTotal
    ) {
      throw new BadRequestException({
        messageKey: 'financialRules.errors.couponUsageLimitReached',
        error: 'FINANCIAL_RULE_COUPON_USAGE_LIMIT_REACHED',
      });
    }

    if (
      coupon.usageLimitPerPatient !== null &&
      coupon.usageLimitPerPatient !== undefined
    ) {
      const patientUsage = await this.couponRepository.countPatientRedemptions(
        coupon.id,
        input.session.patient.id,
      );

      if (patientUsage >= coupon.usageLimitPerPatient) {
        throw new BadRequestException({
          messageKey: 'financialRules.errors.couponPerPatientLimitReached',
          error: 'FINANCIAL_RULE_COUPON_PER_PATIENT_LIMIT_REACHED',
        });
      }
    }

    if (!this.isSupportedScope(coupon.couponScope)) {
      throw new BadRequestException({
        messageKey: 'financialRules.errors.couponScopeUnsupported',
        error: 'FINANCIAL_RULE_COUPON_SCOPE_UNSUPPORTED',
      });
    }

    if (
      coupon.couponScope === CouponScope.PRACTITIONER_SESSIONS &&
      coupon.ownerPractitionerId !== input.session.practitioner.id
    ) {
      throw new BadRequestException({
        messageKey: 'financialRules.errors.couponNotApplicable',
        error: 'FINANCIAL_RULE_COUPON_NOT_APPLICABLE',
      });
    }

    const platformShare = this.moneyMathService.toDecimal(
      coupon.platformSharePercent,
    );
    const practitionerShare = this.moneyMathService.toDecimal(
      coupon.practitionerSharePercent,
    );

    if (
      platformShare.isNegative() ||
      practitionerShare.isNegative() ||
      !platformShare.add(practitionerShare).equals(new Prisma.Decimal(100))
    ) {
      throw new BadRequestException({
        messageKey: 'financialRules.errors.invalidCouponShareSplit',
        error: 'FINANCIAL_RULE_INVALID_COUPON_SHARE_SPLIT',
      });
    }

    return coupon;
  }

  private isSupportedScope(scope: CouponScope) {
    return (
      scope === CouponScope.PLATFORM_WIDE ||
      scope === CouponScope.PRACTITIONER_SESSIONS
    );
  }
}
