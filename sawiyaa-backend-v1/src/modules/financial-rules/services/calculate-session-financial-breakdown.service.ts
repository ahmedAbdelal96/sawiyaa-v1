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
    if (paymentSnapshot) {
      const payment = input.session.payments![0];
      const platformRate =
        payment.commissionPlatformRatePercent?.toString() ?? null;
      const practitionerRate =
        payment.commissionPractitionerRatePercent?.toString() ?? null;
      const platformAmount =
        platformRate === null
          ? null
          : this.moneyMathService
              .percentOf(paymentSnapshot.amountTotal, platformRate)
              .toFixed(2);
      const practitionerAmount =
        platformAmount === null
          ? null
          : this.moneyMathService
              .subtract(paymentSnapshot.amountTotal, platformAmount)
              .toFixed(2);
      const regionalPricingMode =
        paymentSnapshot.currencyCode === 'EGP'
          ? ('EGYPT_LOCAL' as const)
          : ('INTERNATIONAL' as const);
      const purpose =
        payment.paymentPurpose ??
        (input.session.flowType === 'INSTANT'
          ? PaymentPurpose.SESSION_INSTANT_BOOKING
          : PaymentPurpose.SESSION_BOOKING);
      const commissionRule =
        payment.commissionRuleId &&
        platformRate !== null &&
        practitionerRate !== null
          ? {
              id: payment.commissionRuleId,
              slug: payment.commissionRuleId,
              platformRatePercent: platformRate,
              practitionerRatePercent: practitionerRate,
            }
          : null;
      return {
        paymentPurpose: purpose,
        marketType:
          paymentSnapshot.currencyCode === 'EGP'
            ? MarketType.LOCAL
            : MarketType.CROSS_BORDER,
        amountSubtotal: paymentSnapshot.amountSubtotal,
        amountDiscount: paymentSnapshot.amountDiscount,
        amountTotal: paymentSnapshot.amountTotal,
        currencyCode: paymentSnapshot.currencyCode,
        regionalPricingMode,
        provider: paymentSnapshot.provider,
        resolvedCountryIsoCode: null,
        commissionRuleId: payment.commissionRuleId ?? null,
        commissionPlatformRatePercent: platformRate,
        commissionPractitionerRatePercent: practitionerRate,
        couponId: payment.couponId ?? null,
        couponCodeSnapshot: payment.couponCodeSnapshot ?? null,
        couponDiscountSnapshot:
          payment.couponDiscountSnapshot?.toString() ?? null,
        couponPlatformSharePercent:
          payment.couponPlatformShareSnapshot?.toString() ?? null,
        couponPractitionerSharePercent:
          payment.couponPractitionerShareSnapshot?.toString() ?? null,
        breakdown: {
          sessionId: input.session.id,
          paymentPurpose: purpose,
          currency: paymentSnapshot.currencyCode,
          regionalPricingMode,
          provider: paymentSnapshot.provider,
          resolvedCountryIsoCode: null,
          grossAmount: paymentSnapshot.amountSubtotal,
          discountAmount: paymentSnapshot.amountDiscount,
          netPaidAmount: paymentSnapshot.amountTotal,
          platformCommissionAmount: platformAmount,
          practitionerShareAmount: practitionerAmount,
          commissionRule,
          coupon:
            payment.couponId && payment.couponCodeSnapshot
              ? {
                  id: payment.couponId,
                  code: payment.couponCodeSnapshot,
                  discountAmount: paymentSnapshot.amountDiscount,
                  platformSharePercent:
                    payment.couponPlatformShareSnapshot?.toString() ?? '0.00',
                  practitionerSharePercent:
                    payment.couponPractitionerShareSnapshot?.toString() ??
                    '0.00',
                  platformDiscountShareAmount: this.moneyMathService
                    .percentOf(
                      paymentSnapshot.amountDiscount,
                      payment.couponPlatformShareSnapshot?.toString() ?? '0.00',
                    )
                    .toFixed(2),
                  practitionerDiscountShareAmount: this.moneyMathService
                    .subtract(
                      paymentSnapshot.amountDiscount,
                      this.moneyMathService
                        .percentOf(
                          paymentSnapshot.amountDiscount,
                          payment.couponPlatformShareSnapshot?.toString() ??
                            '0.00',
                        )
                        .toFixed(2),
                    )
                    .toFixed(2),
                }
              : null,
        },
      };
    }
    const selectedCurrencyCode = this.resolveSelectedCurrencyCode(
      input.session,
    );
    const regionalResolution = selectedCurrencyCode
      ? resolvePaymentRegionalResolution({
          requestCountryIsoCode:
            selectedCurrencyCode === 'EGP' ? 'EG' : 'US',
        })
      : resolvePaymentRegionalResolution({
          requestCountryIsoCode:
            input.requestCountryIsoCode ??
            input.session.requestCountryIsoCode ??
            null,
          patientCountryIsoCode: input.session.patient.country?.isoCode ?? null,
          practitionerCountryIsoCode:
            input.session.practitioner.country?.isoCode ?? null,
        });
    const currencyCode = selectedCurrencyCode ?? regionalResolution.currencyCode;
    const grossAmount = this.resolveGrossAmount(input.session, currencyCode);

    // Instant booking prices are customer-facing quotes. Commission is an
    // internal allocation and must not prevent the patient from seeing or
    // paying the immutable quote when an admin rule is not configured yet.
    const commission =
      input.session.flowType === 'INSTANT' && !input.requireCommissionRule
        ? null
        : await this.resolveCommissionRuleService.resolveForSession(
            input.session,
          );

    const couponCode =
      !paymentSnapshot && input.couponCode?.trim()
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

    const discountAmount = couponBreakdown?.discountAmount ?? '0.00';
    const netPaidAmount = this.moneyMathService
      .subtract(grossAmount, discountAmount)
      .toFixed(2);
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
      paymentPurpose:
        commission?.paymentPurpose ?? PaymentPurpose.SESSION_INSTANT_BOOKING,
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
      paymentPurpose:
        commission?.paymentPurpose ?? PaymentPurpose.SESSION_INSTANT_BOOKING,
      marketType:
        commission?.rule.marketType ??
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
      commissionPractitionerRatePercent:
        commission?.practitionerRatePercent ?? null,
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
    // Instant request quote precedes Session creation and takes precedence.
    if (session.flowType === 'INSTANT') {
      const quoted = this.resolveInstantBookingQuoteAmount(
        session,
        currencyCode,
      );
      if (quoted !== null) return this.normalizeSnapshotAmount(quoted);
    }
    const policy = session.pricingPolicySnapshotJson as {
      pricingSnapshot?: Record<string, Record<string, string | null>>;
    } | null;
    if (policy?.pricingSnapshot) {
      const amount =
        policy.pricingSnapshot[currencyCode]?.[String(session.durationMinutes)];
      if (amount === null || amount === undefined)
        this.throwInvalidPaymentSnapshot();
      return this.normalizeSnapshotAmount(amount);
    }
    // An unpaid historical session without a booking-time quote cannot be
    // priced safely. Requiring reconciliation is preferable to silently using
    // today's practitioner profile price.
    this.throwInvalidPaymentSnapshot();
  }

  private resolveSelectedCurrencyCode(
    session: SessionFinancialContext,
  ): 'EGP' | 'USD' | null {
    const policy = session.pricingPolicySnapshotJson;
    const selectedFromPolicy =
      policy && typeof policy === 'object'
        ? (policy as Record<string, unknown>).selectedCurrencyCode
        : null;
    if (selectedFromPolicy === 'EGP' || selectedFromPolicy === 'USD') {
      return selectedFromPolicy;
    }

    const metadata = session.instantBookingRequest?.metadataJson;
    const selectedFromInstant =
      metadata && typeof metadata === 'object'
        ? ((metadata as Record<string, unknown>).selectedMoney as
            | Record<string, unknown>
            | undefined)?.currencyCode
        : null;
    return selectedFromInstant === 'EGP' || selectedFromInstant === 'USD'
      ? selectedFromInstant
      : null;
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

    const subtotal = this.normalizeSnapshotAmount(payment.amountSubtotal);
    const discount = this.normalizeSnapshotAmount(payment.amountDiscount);
    const total = this.normalizeSnapshotAmount(payment.amountTotal);
    if (!this.moneyMathService.toDecimal(subtotal).sub(discount).eq(total))
      this.throwInvalidPaymentSnapshot();
    return {
      amountSubtotal: subtotal,
      amountDiscount: discount,
      amountTotal: total,
      currencyCode,
      provider: payment.provider,
    };
  }

  private normalizeSnapshotAmount(value: { toString(): string } | string) {
    try {
      const normalized = this.moneyMathService.toDecimal(value).toFixed(2);
      if (
        !this.moneyMathService.toDecimal(normalized).isFinite() ||
        this.moneyMathService.toDecimal(normalized).lt(0)
      ) {
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

    const currencySnapshot = (snapshot as Record<string, unknown>)[
      currencyCode
    ];
    if (!currencySnapshot || typeof currencySnapshot !== 'object') {
      return null;
    }

    const durationSnapshot = (currencySnapshot as Record<string, unknown>)[
      String(session.durationMinutes)
    ] as { toString(): string } | string | null | undefined;

    return this.toMaybeAmountString(durationSnapshot);
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
