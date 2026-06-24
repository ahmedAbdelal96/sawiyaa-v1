import { BadRequestException, Injectable } from '@nestjs/common';
import { CommissionRule, MarketType, PaymentPurpose } from '@prisma/client';
import { CommissionRuleRepository } from '../repositories/commission-rule.repository';
import { MoneyMathService } from './money-math.service';
import { ValidateCommissionRuleDefinitionService } from './validate-commission-rule-definition.service';
import { SessionFinancialContext } from '../types/financial-rules.types';

/**
 * Commission rule resolution is centralized so payment initiation, coupon
 * breakdowns, and later ledger posting all consume the same deterministic rule.
 */
@Injectable()
export class ResolveCommissionRuleService {
  constructor(
    private readonly commissionRuleRepository: CommissionRuleRepository,
    private readonly validateCommissionRuleDefinitionService: ValidateCommissionRuleDefinitionService,
    private readonly moneyMathService: MoneyMathService,
  ) {}

  async resolveForSession(session: SessionFinancialContext) {
    const candidates = await this.commissionRuleRepository.listActiveRules(
      new Date(),
    );
    const primarySpecialtyId =
      session.practitioner.specialties.find((specialty) => specialty.isPrimary)
        ?.specialtyId ??
      session.practitioner.specialties[0]?.specialtyId ??
      null;
    const marketType = this.resolveMarketType(
      session.practitioner.countryId,
      session.patient.countryId,
    );

    const matching = candidates
      .filter((rule) =>
        this.matchesRule(rule, {
          practitionerCountryId: session.practitioner.countryId,
          patientCountryId: session.patient.countryId,
          marketType,
          sessionFlowType: session.flowType,
          sessionMode: session.sessionMode,
          specialtyId: primarySpecialtyId,
        }),
      )
      .sort((left, right) => {
        const priorityDiff = right.priority - left.priority;
        if (priorityDiff !== 0) {
          return priorityDiff;
        }

        const specificityDiff =
          this.calculateSpecificity(right) - this.calculateSpecificity(left);
        if (specificityDiff !== 0) {
          return specificityDiff;
        }

        if (left.isDefault !== right.isDefault) {
          return Number(left.isDefault) - Number(right.isDefault);
        }

        return left.createdAt.getTime() - right.createdAt.getTime();
      });

    const resolved = matching[0];

    if (!resolved) {
      throw new BadRequestException({
        messageKey: 'financialRules.errors.commissionRuleNotFound',
        error: 'FINANCIAL_RULE_COMMISSION_RULE_NOT_FOUND',
      });
    }

    this.validateCommissionRuleDefinitionService.validate({
      platformRatePercent: resolved.platformRatePercent,
      practitionerRatePercent: resolved.practitionerRatePercent,
    });

    return {
      rule: resolved,
      paymentPurpose:
        session.flowType === 'INSTANT'
          ? PaymentPurpose.SESSION_INSTANT_BOOKING
          : PaymentPurpose.SESSION_BOOKING,
      platformRatePercent: this.moneyMathService
        .toDecimal(resolved.platformRatePercent)
        .toFixed(2),
      practitionerRatePercent: this.moneyMathService
        .toDecimal(resolved.practitionerRatePercent)
        .toFixed(2),
    };
  }

  private resolveMarketType(
    practitionerCountryId: string | null,
    patientCountryId: string | null,
  ): MarketType {
    if (!practitionerCountryId || !patientCountryId) {
      return MarketType.ANY;
    }

    return practitionerCountryId === patientCountryId
      ? MarketType.LOCAL
      : MarketType.CROSS_BORDER;
  }

  private matchesRule(
    rule: CommissionRule,
    context: {
      practitionerCountryId: string | null;
      patientCountryId: string | null;
      marketType: MarketType;
      sessionFlowType: SessionFinancialContext['flowType'];
      sessionMode: SessionFinancialContext['sessionMode'];
      specialtyId: string | null;
    },
  ) {
    if (
      rule.marketType !== MarketType.ANY &&
      rule.marketType !== context.marketType
    ) {
      return false;
    }

    if (
      rule.practitionerCountryId &&
      rule.practitionerCountryId !== context.practitionerCountryId
    ) {
      return false;
    }

    if (
      rule.patientCountryId &&
      rule.patientCountryId !== context.patientCountryId
    ) {
      return false;
    }

    if (
      rule.sessionFlowType &&
      rule.sessionFlowType !== context.sessionFlowType
    ) {
      return false;
    }

    if (rule.sessionMode && rule.sessionMode !== context.sessionMode) {
      return false;
    }

    if (rule.specialtyId && rule.specialtyId !== context.specialtyId) {
      return false;
    }

    return true;
  }

  private calculateSpecificity(rule: CommissionRule) {
    return [
      rule.marketType !== MarketType.ANY,
      Boolean(rule.practitionerCountryId),
      Boolean(rule.patientCountryId),
      Boolean(rule.sessionFlowType),
      Boolean(rule.sessionMode),
      Boolean(rule.specialtyId),
    ].filter(Boolean).length;
  }
}
