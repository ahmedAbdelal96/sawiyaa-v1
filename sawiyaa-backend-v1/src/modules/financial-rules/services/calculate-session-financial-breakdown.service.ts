import { BadRequestException, Injectable } from '@nestjs/common';
import { MarketType, PaymentProvider, PaymentPurpose } from '@prisma/client';
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
    requestCountryIsoCode?: string | null;
    couponCode?: string | null;
    requireCommissionRule?: boolean;
  }): Promise<PaymentFinancialResolution> {
    const paymentSnapshot = this.resolvePaymentSnapshot(input.session);
    const regionalResolution = paymentSnapshot
      ? {
          currencyCode: paymentSnapshot.currencyCode,
          regionalPricingMode:
            paymentSnapshot.currencyCode === 'EGP'
              ? ('EGYPT_LOCAL' as const)
              : ('INTERNATIONAL' as const),
          provider: paymentSnapshot.provider,
          resolvedCountryIsoCode: null,
        }
      : resolvePaymentRegionalResolution({
          requestCountryIsoCode:
            input.requestCountryIsoCode ??
            input.session.requestCountryIsoCode ??
            null,
          patientCountryIsoCode: input.session.patient.country?.isoCode ?? null,
          practitionerCountryIsoCode:
            input.session.practitioner.country?.isoCode ?? null,
        });
    const currencyCode = regionalResolution.currencyCode;
    const grossAmount = paymentSnapshot
      ? paymentSnapshot.amountSubtotal
      : this.resolveGrossAmount(input.session, currencyCode);

    // Instant booking prices are customer-facing quotes. Commission is an
    // internal allocation and must not prevent the patient from seeing or
    // paying the immutable quote when an admin rule is not configured yet.
    const commission =
      input.session.flowType === 'INSTANT' && !input.requireCommissionRule
        ? null
        : await this.resolveCommissionRuleService.resolveForSession(input.session);

    const couponCode = !paymentSnapshot && input.couponCode?.trim()
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

    const discountAmount = paymentSnapshot
      ? paymentSnapshot.amountDiscount
      : (couponBreakdown?.discountAmount ?? '0.00');
    const netPaidAmount = paymentSnapshot
      ? paymentSnapshot.amountTotal
      : this.moneyMathService.subtract(grossAmount, discountAmount).toFixed(2);
    const platformCommissionAmount = commission
      ? this.moneyMathService
          .percentOf(netPaidAmount, commission.platformRatePercent)
          .toFixed(2)
      : null;
    const practitionerShareAmount = commission
      ? this.moneyMathService
          .subtract(netPaidAmount, platformCommissionAmount!)
          .toFixed(2)
      : null;

    const breakdown: SessionFinancialBreakdownViewModel = {
      sessionId: input.session.id,
      paymentPurpose: commission?.paymentPurpose ?? PaymentPurpose.SESSION_INSTANT_BOOKING,
      currency: currencyCode,
      regionalPricingMode: regionalResolution.regionalPricingMode,
      provider: regionalResolution.provider,
      resolvedCountryIsoCode: regionalResolution.resolvedCountryIsoCode,
      grossAmount,
      discountAmount,
      netPaidAmount,
      platformCommissionAmount,
      practitionerShareAmount,
      commissionRule: commission
        ? {
            id: commission.rule.id,
            slug: commission.rule.slug,
            platformRatePercent: commission.platformRatePercent,
            practitionerRatePercent: commission.practitionerRatePercent,
          }
        : null,
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
      paymentPurpose: commission?.paymentPurpose ?? PaymentPurpose.SESSION_INSTANT_BOOKING,
      marketType: commission?.rule.marketType ??
        (currencyCode === 'EGP' ? MarketType.LOCAL : MarketType.CROSS_BORDER),
      amountSubtotal: grossAmount,
      amountDiscount: discountAmount,
      amountTotal: netPaidAmount,
      currencyCode,
      regionalPricingMode: regionalResolution.regionalPricingMode,
      provider: regionalResolution.provider,
      resolvedCountryIsoCode: regionalResolution.resolvedCountryIsoCode,
      commissionRuleId: commission?.rule.id ?? null,
      commissionPlatformRatePercent: commission?.platformRatePercent ?? null,
      commissionPractitionerRatePercent: commission?.practitionerRatePercent ?? null,
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

  private resolvePaymentSnapshot(session: SessionFinancialContext): {
    amountSubtotal: string;
    amountDiscount: string;
    amountTotal: string;
    currencyCode: 'EGP' | 'USD';
    provider: PaymentProvider;
  } | null {
    const payment = session.payments?.[0] ?? null;
    if (!payment) {
      return null;
    }

    const currencyCode = payment.currencyCode.trim().toUpperCase();
    if (currencyCode !== 'EGP' && currencyCode !== 'USD') {
      this.throwInvalidPaymentSnapshot();
    }

    return {
      amountSubtotal: this.normalizeSnapshotAmount(payment.amountSubtotal),
      amountDiscount: this.normalizeSnapshotAmount(payment.amountDiscount),
      amountTotal: this.normalizeSnapshotAmount(payment.amountTotal),
      currencyCode,
      provider: payment.provider,
    };
  }

  private normalizeSnapshotAmount(value: { toString(): string } | string) {
    try {
      const normalized = this.moneyMathService.toDecimal(value).toFixed(2);
      if (this.moneyMathService.toDecimal(normalized).lt(0)) {
        this.throwInvalidPaymentSnapshot();
      }
      return normalized;
    } catch {
      this.throwInvalidPaymentSnapshot();
    }
  }

  private throwInvalidPaymentSnapshot(): never {
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
