import { BadRequestException, Injectable } from '@nestjs/common';
import { PaymentPurpose } from '@prisma/client';
import { CouponRepository } from '../repositories/coupon.repository';
import {
  PaymentFinancialResolution,
  SessionFinancialBreakdownViewModel,
  SessionFinancialContext,
} from '../types/financial-rules.types';
import { normalizeCouponCode } from '../utils/normalize-financial-identifiers.util';
import { CalculateCouponDiscountService } from './calculate-coupon-discount.service';
import { MoneyMathService } from './money-math.service';
import { ResolveCommissionRuleService } from './resolve-commission-rule.service';
import { ValidateCouponEligibilityService } from './validate-coupon-eligibility.service';

/**
 * This service is the single normalized money breakdown producer for sessions.
 * Payments can collect money from it today, and Ledger can post from it later.
 */
@Injectable()
export class CalculateSessionFinancialBreakdownService {
  constructor(
    private readonly couponRepository: CouponRepository,
    private readonly resolveCommissionRuleService: ResolveCommissionRuleService,
    private readonly validateCouponEligibilityService: ValidateCouponEligibilityService,
    private readonly calculateCouponDiscountService: CalculateCouponDiscountService,
    private readonly moneyMathService: MoneyMathService,
  ) {}

  async calculate(input: {
    session: SessionFinancialContext;
    couponCode?: string | null;
  }): Promise<PaymentFinancialResolution> {
    const grossAmount = this.resolveGrossAmount(input.session);
    const currencyCode =
      input.session.practitioner.country?.currencyCode?.trim();

    if (!currencyCode) {
      throw new BadRequestException({
        messageKey: 'financialRules.errors.currencyUnavailable',
        error: 'FINANCIAL_RULE_CURRENCY_UNAVAILABLE',
      });
    }

    const commission =
      await this.resolveCommissionRuleService.resolveForSession(input.session);

    const couponCode = input.couponCode?.trim()
      ? normalizeCouponCode(input.couponCode)
      : null;
    const coupon = couponCode
      ? await this.couponRepository.findByCode(couponCode)
      : null;

    const validatedCoupon = couponCode
      ? await this.validateCouponEligibilityService.validateForSession({
          coupon,
          session: input.session,
        })
      : null;

    const couponBreakdown = validatedCoupon
      ? this.calculateCouponDiscountService.calculate({
          grossAmount,
          coupon: validatedCoupon,
        })
      : null;

    const netPaidAmount = this.moneyMathService
      .subtract(grossAmount, couponBreakdown?.discountAmount ?? '0')
      .toFixed(2);
    const platformCommissionAmount = this.moneyMathService
      .percentOf(netPaidAmount, commission.platformRatePercent)
      .toFixed(2);
    const practitionerShareAmount = this.moneyMathService
      .subtract(netPaidAmount, platformCommissionAmount)
      .toFixed(2);

    const breakdown: SessionFinancialBreakdownViewModel = {
      sessionId: input.session.id,
      paymentPurpose: commission.paymentPurpose,
      currency: currencyCode,
      grossAmount,
      discountAmount: couponBreakdown?.discountAmount ?? '0.00',
      netPaidAmount,
      platformCommissionAmount,
      practitionerShareAmount,
      commissionRule: {
        id: commission.rule.id,
        slug: commission.rule.slug,
        platformRatePercent: commission.platformRatePercent,
        practitionerRatePercent: commission.practitionerRatePercent,
      },
      coupon: validatedCoupon
        ? {
            id: validatedCoupon.id,
            code: validatedCoupon.code,
            discountAmount: couponBreakdown!.discountAmount,
            platformDiscountShareAmount:
              couponBreakdown!.platformDiscountShareAmount,
            practitionerDiscountShareAmount:
              couponBreakdown!.practitionerDiscountShareAmount,
            platformSharePercent: couponBreakdown!.platformSharePercent,
            practitionerSharePercent: couponBreakdown!.practitionerSharePercent,
          }
        : null,
    };

    return {
      paymentPurpose: commission.paymentPurpose,
      marketType: commission.rule.marketType,
      amountSubtotal: grossAmount,
      amountDiscount: breakdown.discountAmount,
      amountTotal: netPaidAmount,
      currencyCode,
      commissionRuleId: commission.rule.id,
      commissionPlatformRatePercent: commission.platformRatePercent,
      commissionPractitionerRatePercent: commission.practitionerRatePercent,
      couponId: validatedCoupon?.id ?? null,
      couponCodeSnapshot: validatedCoupon?.code ?? null,
      couponDiscountSnapshot: validatedCoupon ? breakdown.discountAmount : null,
      couponPlatformSharePercent: validatedCoupon
        ? couponBreakdown!.platformSharePercent
        : null,
      couponPractitionerSharePercent: validatedCoupon
        ? couponBreakdown!.practitionerSharePercent
        : null,
      breakdown,
    };
  }

  private resolveGrossAmount(session: SessionFinancialContext) {
    const amountFromPractitioner =
      session.durationMinutes === 30
        ? session.practitioner.sessionPrice30
        : session.durationMinutes === 60
          ? session.practitioner.sessionPrice60
          : null;

    if (amountFromPractitioner) {
      return this.moneyMathService.toDecimal(amountFromPractitioner).toFixed(2);
    }

    const latestPaymentAmount = session.payments?.[0]?.amountSubtotal ?? null;
    if (latestPaymentAmount) {
      return this.moneyMathService.toDecimal(latestPaymentAmount).toFixed(2);
    }

    throw new BadRequestException({
      messageKey: 'financialRules.errors.pricingUnavailable',
      error: 'FINANCIAL_RULE_PRICING_UNAVAILABLE',
    });
  }
}
