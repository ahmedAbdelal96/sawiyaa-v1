import { Injectable } from '@nestjs/common';
import { CommissionRule, Coupon } from '@prisma/client';
import {
  ResolvedCommissionRuleViewModel,
  ResolvedCouponViewModel,
  SessionFinancialBreakdownViewModel,
} from '../types/financial-rules.types';

@Injectable()
export class FinancialRulesMapper {
  toCommissionRule(rule: CommissionRule): ResolvedCommissionRuleViewModel {
    return {
      id: rule.id,
      slug: rule.slug,
      ruleName: rule.ruleName,
      ruleScope: rule.ruleScope,
      marketType: rule.marketType,
      platformRatePercent: rule.platformRatePercent.toString(),
      practitionerRatePercent: rule.practitionerRatePercent.toString(),
      priority: rule.priority,
      isDefault: rule.isDefault,
      isActive: rule.isActive,
      practitionerCountryId: rule.practitionerCountryId ?? null,
      patientCountryId: rule.patientCountryId ?? null,
      sessionFlowType: rule.sessionFlowType ?? null,
      sessionMode: rule.sessionMode ?? null,
      specialtyId: rule.specialtyId ?? null,
      startsAt: rule.startsAt?.toISOString() ?? null,
      endsAt: rule.endsAt?.toISOString() ?? null,
      createdAt: rule.createdAt.toISOString(),
      updatedAt: rule.updatedAt.toISOString(),
    };
  }

  toCoupon(coupon: Coupon): ResolvedCouponViewModel {
    return {
      id: coupon.id,
      code: coupon.code,
      slug: coupon.slug,
      couponScope: coupon.couponScope,
      status: coupon.status,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue.toString(),
      maxDiscountAmount: coupon.maxDiscountAmount?.toString() ?? null,
      platformSharePercent: coupon.platformSharePercent.toString(),
      practitionerSharePercent: coupon.practitionerSharePercent.toString(),
      usageLimitTotal: coupon.usageLimitTotal ?? null,
      usageLimitPerPatient: coupon.usageLimitPerPatient ?? null,
      currentUsageCount: coupon.currentUsageCount,
      requiresApproval: coupon.requiresApproval,
      approvedAt: coupon.approvedAt?.toISOString() ?? null,
      startsAt: coupon.startsAt?.toISOString() ?? null,
      endsAt: coupon.endsAt?.toISOString() ?? null,
      isActive: coupon.isActive,
      ownerPractitionerId: coupon.ownerPractitionerId ?? null,
      createdAt: coupon.createdAt.toISOString(),
      updatedAt: coupon.updatedAt.toISOString(),
    };
  }

  toBreakdown(
    breakdown: SessionFinancialBreakdownViewModel,
  ): SessionFinancialBreakdownViewModel {
    return breakdown;
  }
}
