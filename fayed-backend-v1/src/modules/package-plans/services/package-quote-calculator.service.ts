import { BadRequestException, Injectable } from '@nestjs/common';
import {
  MarketType,
  Prisma,
  SessionFlowType,
  SessionMode,
} from '@prisma/client';
import { MoneyMathService } from '@modules/financial-rules/services/money-math.service';
import { ResolveCommissionRuleService } from '@modules/financial-rules/services/resolve-commission-rule.service';
import { ValidateSessionDurationService } from '@modules/sessions/services/validate-session-duration.service';
import { ValidatePackagePlanService } from './validate-package-plan.service';
import { PackagePlanQuoteViewModel } from '../types/package-plans.types';

type PackagePlanQuoteInput = {
  plan: {
    code: string;
    sessionCount: number;
    discountPercent: Prisma.Decimal | string | number;
  };
  practitioner: {
    id: string;
    publicSlug: string;
    sessionPrice30Egp: { toString(): string } | string | null;
    sessionPrice30Usd: { toString(): string } | string | null;
    sessionPrice60Egp: { toString(): string } | string | null;
    sessionPrice60Usd: { toString(): string } | string | null;
    countryId: string | null;
    country: {
      currencyCode: string | null;
    } | null;
    specialties: Array<{
      specialtyId: string;
      isPrimary: boolean;
    }>;
  };
  selectedDurationMinutes: number;
  sessionMode: SessionMode;
  selectedCurrencyCode: string;
  patient: {
    id: string;
    countryId: string | null;
  } | null;
  internalBreakdownVisible: boolean;
};

@Injectable()
export class PackageQuoteCalculatorService {
  constructor(
    private readonly validateSessionDurationService: ValidateSessionDurationService,
    private readonly validatePackagePlanService: ValidatePackagePlanService,
    private readonly resolveCommissionRuleService: ResolveCommissionRuleService,
    private readonly moneyMathService: MoneyMathService,
  ) {}

  async calculate(input: PackagePlanQuoteInput): Promise<PackagePlanQuoteViewModel> {
    this.validatePackagePlanService.validateStandardPlan({
      code: input.plan.code,
      sessionCount: input.plan.sessionCount,
      discountPercent: Number(
        this.moneyMathService.toDecimal(input.plan.discountPercent).toFixed(2),
      ),
    });

    this.validateSessionDurationService.validate(input.selectedDurationMinutes);

    const normalizedCurrencyCode = input.selectedCurrencyCode.trim().toUpperCase();
    if (!['EGP', 'USD'].includes(normalizedCurrencyCode)) {
      throw new BadRequestException({
        messageKey: 'packagePlans.errors.unsupportedCurrency',
        error: 'PACKAGE_PLAN_UNSUPPORTED_CURRENCY',
      });
    }
    const selectedCurrencyCode = normalizedCurrencyCode as 'EGP' | 'USD';

    const selectedBaseSessionPrice = this.resolveSessionPrice(
      input.practitioner,
      input.selectedDurationMinutes,
      selectedCurrencyCode,
    );
    const selectedBaseSessionPriceDecimal = this.moneyMathService.toDecimal(
      selectedBaseSessionPrice,
    );
    const baseSessionPriceEgp = this.resolvePriceValue(
      input.practitioner,
      input.selectedDurationMinutes,
      'EGP',
    );
    const baseSessionPriceUsd = this.resolvePriceValue(
      input.practitioner,
      input.selectedDurationMinutes,
      'USD',
    );

    const undiscountedTotal = this.moneyMathService.roundMoney(
      selectedBaseSessionPriceDecimal.mul(input.plan.sessionCount),
    );
    const discountAmount = this.moneyMathService.percentOf(
      undiscountedTotal,
      input.plan.discountPercent,
    );
    const patientPayableTotal = this.moneyMathService.subtract(
      undiscountedTotal,
      discountAmount,
    );
    const platformDiscountShare = this.moneyMathService.roundMoney(
      discountAmount.div(2),
    );
    const practitionerDiscountShare = this.moneyMathService.subtract(
      discountAmount,
      platformDiscountShare,
    );

    let commissionMode: MarketType | null = null;
    let platformOriginalShare: Prisma.Decimal | null = null;
    let practitionerOriginalShare: Prisma.Decimal | null = null;
    let platformFinalShare: Prisma.Decimal | null = null;
    let practitionerFinalShare: Prisma.Decimal | null = null;
    let roundingAdjustment: Prisma.Decimal | null = null;

    if (input.internalBreakdownVisible && input.patient) {
      const commission = await this.resolveCommissionRuleService.resolveForSession(
        {
          id: `${input.plan.code}:${input.practitioner.id}:${input.selectedDurationMinutes}:${selectedCurrencyCode}`,
          flowType: SessionFlowType.SCHEDULED,
          sessionMode: input.sessionMode,
          durationMinutes: input.selectedDurationMinutes,
          practitioner: {
            id: input.practitioner.id,
            publicSlug: input.practitioner.publicSlug,
            countryId: input.practitioner.countryId,
            country: input.practitioner.country,
            specialties: input.practitioner.specialties,
          },
          patient: {
            id: input.patient.id,
            countryId: input.patient.countryId,
          },
        },
      );

      commissionMode = commission.rule.marketType;
      platformOriginalShare = this.moneyMathService.roundMoney(
        undiscountedTotal.mul(
          this.moneyMathService.toDecimal(commission.platformRatePercent).div(100),
        ),
      );
      practitionerOriginalShare = this.moneyMathService.subtract(
        undiscountedTotal,
        platformOriginalShare,
      );
      platformFinalShare = this.moneyMathService.subtract(
        platformOriginalShare,
        platformDiscountShare,
      );
      practitionerFinalShare = this.moneyMathService.subtract(
        practitionerOriginalShare,
        practitionerDiscountShare,
      );

      roundingAdjustment = this.moneyMathService.subtract(
        patientPayableTotal,
        this.moneyMathService.add(platformFinalShare, practitionerFinalShare),
      );

      practitionerFinalShare = this.moneyMathService.add(
        practitionerFinalShare,
        roundingAdjustment,
      );
    }

    return {
      planCode: input.plan.code,
      sessionCount: input.plan.sessionCount,
      discountPercent: this.moneyMathService
        .toDecimal(input.plan.discountPercent)
        .toFixed(2),
      practitionerId: input.practitioner.id,
      durationMinutes: input.selectedDurationMinutes,
      sessionMode: input.sessionMode,
      baseSessionPriceEgp,
      baseSessionPriceUsd,
      selectedCurrencyCode: normalizedCurrencyCode,
      selectedBaseSessionPrice: selectedBaseSessionPriceDecimal.toFixed(2),
      undiscountedTotal: undiscountedTotal.toFixed(2),
      discountAmount: discountAmount.toFixed(2),
      patientPayableTotal: patientPayableTotal.toFixed(2),
      platformDiscountShare: platformDiscountShare.toFixed(2),
      practitionerDiscountShare: practitionerDiscountShare.toFixed(2),
      commissionMode,
      platformOriginalShare: platformOriginalShare?.toFixed(2) ?? null,
      practitionerOriginalShare: practitionerOriginalShare?.toFixed(2) ?? null,
      platformFinalShare: platformFinalShare?.toFixed(2) ?? null,
      practitionerFinalShare: practitionerFinalShare?.toFixed(2) ?? null,
      roundingAdjustment: roundingAdjustment?.toFixed(2) ?? null,
      internalBreakdownVisible: input.internalBreakdownVisible,
    };
  }

  private resolveSessionPrice(
    practitioner: PackagePlanQuoteInput['practitioner'],
    durationMinutes: number,
    currencyCode: 'EGP' | 'USD',
  ): string {
    const amount = this.resolvePriceValue(
      practitioner,
      durationMinutes,
      currencyCode,
    );

    if (!amount) {
      throw new BadRequestException({
        messageKey: 'packagePlans.errors.currencyPriceUnavailable',
        error: 'PACKAGE_PLAN_CURRENCY_PRICE_UNAVAILABLE',
        context: {
          durationMinutes,
          currencyCode,
        },
      });
    }

    return amount;
  }

  private resolvePriceValue(
    practitioner: PackagePlanQuoteInput['practitioner'],
    durationMinutes: number,
    currencyCode: 'EGP' | 'USD',
  ): string | null {
    const amount =
      durationMinutes === 30
        ? currencyCode === 'EGP'
          ? practitioner.sessionPrice30Egp
          : practitioner.sessionPrice30Usd
        : durationMinutes === 60
          ? currencyCode === 'EGP'
            ? practitioner.sessionPrice60Egp
            : practitioner.sessionPrice60Usd
          : null;

    if (!amount) {
      return null;
    }

    return this.moneyMathService.toDecimal(amount).toFixed(2);
  }
}
