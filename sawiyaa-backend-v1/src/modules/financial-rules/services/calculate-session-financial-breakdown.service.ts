import { BadRequestException, Injectable } from '@nestjs/common';
import { PaymentPurpose } from '@prisma/client';
import { CouponRepository } from '../repositories/coupon.repository';
import { resolvePaymentRegionalResolution } from '@common/payments/payment-region.resolver';
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
    const regionalResolution = resolvePaymentRegionalResolution({
      patientCountryIsoCode: input.session.patient.country?.isoCode ?? null,
      accountCountryIsoCode: null,
      checkoutCountryIsoCode: null,
      operatingCountryIsoCode:
        input.session.practitioner.country?.isoCode ?? null,
    });
    const currencyCode = regionalResolution.currencyCode;
    const grossAmount = this.resolveGrossAmount(input.session, currencyCode);

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
      regionalPricingMode: regionalResolution.regionalPricingMode,
      provider: regionalResolution.provider,
      resolvedCountryIsoCode: regionalResolution.resolvedCountryIsoCode,
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
      regionalPricingMode: regionalResolution.regionalPricingMode,
      provider: regionalResolution.provider,
      resolvedCountryIsoCode: regionalResolution.resolvedCountryIsoCode,
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

  private resolveGrossAmount(
    session: SessionFinancialContext,
    currencyCode: string,
  ) {
    const latestPaymentAmount = session.payments?.[0]?.amountSubtotal ?? null;
    if (latestPaymentAmount) {
      return this.moneyMathService.toDecimal(latestPaymentAmount).toFixed(2);
    }

    if (session.flowType === 'INSTANT') {
      const quoteAmount = this.resolveInstantBookingQuoteAmount(
        session,
        currencyCode,
      );
      if (quoteAmount) {
        return this.moneyMathService.toDecimal(quoteAmount).toFixed(2);
      }

      const instantPractitionerAmount = this.resolveInstantBookingPractitionerAmount(
        session,
        currencyCode,
      );
      if (instantPractitionerAmount) {
        return this.moneyMathService
          .toDecimal(instantPractitionerAmount)
          .toFixed(2);
      }
    }

    const amountFromPractitioner =
      currencyCode === 'EGP'
        ? session.durationMinutes === 30
          ? (session.practitioner.sessionPrice30Egp ??
            session.practitioner.sessionPrice30)
          : session.durationMinutes === 60
            ? (session.practitioner.sessionPrice60Egp ??
              session.practitioner.sessionPrice60)
            : null
        : session.durationMinutes === 30
          ? (session.practitioner.sessionPrice30Usd ??
            session.practitioner.sessionPrice30)
          : session.durationMinutes === 60
            ? (session.practitioner.sessionPrice60Usd ??
              session.practitioner.sessionPrice60)
            : null;

    if (amountFromPractitioner) {
      return this.moneyMathService.toDecimal(amountFromPractitioner).toFixed(2);
    }

    throw new BadRequestException({
      messageKey: 'financialRules.errors.pricingUnavailable',
      error: 'FINANCIAL_RULE_PRICING_UNAVAILABLE',
    });
  }

  private resolveInstantBookingQuoteAmount(
    session: SessionFinancialContext,
    currencyCode: string,
  ): string | null {
    const metadata = session.instantBookingRequest?.metadataJson;
    if (!metadata || typeof metadata !== 'object') {
      return null;
    }

    const snapshot = (metadata as Record<string, unknown>).pricingSnapshot;
    if (!snapshot || typeof snapshot !== 'object') {
      return null;
    }

    const currencySnapshot = (snapshot as Record<string, unknown>)[currencyCode];
    if (!currencySnapshot || typeof currencySnapshot !== 'object') {
      return null;
    }

    const durationSnapshot = (
      currencySnapshot as Record<string, unknown>
    )[String(session.durationMinutes)] as
      | { toString(): string }
      | string
      | null
      | undefined;

    return this.toMaybeAmountString(durationSnapshot);
  }

  private resolveInstantBookingPractitionerAmount(
    session: SessionFinancialContext,
    currencyCode: string,
  ): string | null {
    if (currencyCode === 'EGP') {
      return session.durationMinutes === 30
        ? this.toMaybeAmountString(session.practitioner.instantBookingPrice30Egp)
        : session.durationMinutes === 60
          ? this.toMaybeAmountString(session.practitioner.instantBookingPrice60Egp)
          : null;
    }

    if (currencyCode === 'USD') {
      return session.durationMinutes === 30
        ? this.toMaybeAmountString(session.practitioner.instantBookingPrice30Usd)
        : session.durationMinutes === 60
          ? this.toMaybeAmountString(session.practitioner.instantBookingPrice60Usd)
          : null;
    }

    return null;
  }

  private toMaybeAmountString(
    value: { toString(): string } | string | null | undefined,
  ): string | null {
    if (value === null || value === undefined) {
      return null;
    }

    const normalized = value.toString().trim();
    return normalized.length > 0 ? normalized : null;
  }
}
