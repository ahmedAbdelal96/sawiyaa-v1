import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CommissionRuleRepository } from '../repositories/commission-rule.repository';
import { MarketType } from '@prisma/client';
import { ValidateCommissionRuleDefinitionService } from '../services/validate-commission-rule-definition.service';
import { PLATFORM_DEFAULTS } from '@modules/config/registry/platform-defaults';

const LOCAL_DEFAULT = PLATFORM_DEFAULTS.revenueShare.local;
const CROSS_BORDER_DEFAULT = PLATFORM_DEFAULTS.revenueShare.crossBorder;
const LOCAL_DEFAULT_SLUG = LOCAL_DEFAULT.slug;
const CROSS_BORDER_DEFAULT_SLUG = CROSS_BORDER_DEFAULT.slug;

@Injectable()
export class GetRevenueShareRulesUseCase {
  constructor(
    private readonly commissionRuleRepository: CommissionRuleRepository,
    private readonly validateCommissionRuleDefinitionService: ValidateCommissionRuleDefinitionService,
  ) {}

  async execute() {
    const [local, crossBorder] = await Promise.all([
      this.readRequiredRule(LOCAL_DEFAULT),
      this.readRequiredRule(CROSS_BORDER_DEFAULT),
    ]);

    const localPlatform = this.toPercent(local.platformRatePercent);
    const crossBorderPlatform = this.toPercent(crossBorder.platformRatePercent);
    const localPractitioner = this.toPercent(local.practitionerRatePercent);
    const crossBorderPractitioner = this.toPercent(
      crossBorder.practitionerRatePercent,
    );
    const isUnified =
      localPlatform === crossBorderPlatform &&
      localPractitioner === crossBorderPractitioner;
    const updatedAt = new Date(
      Math.max(local.updatedAt.getTime(), crossBorder.updatedAt.getTime()),
    );

    return {
      item: {
        configurationState: isUnified ? ('READY' as const) : ('REQUIRES_UNIFICATION' as const),
        platformCommissionPercent: isUnified ? localPlatform : null,
        practitionerSharePercent: isUnified ? localPractitioner : null,
        effectiveAt: isUnified ? updatedAt.toISOString() : null,
        updatedAt: updatedAt.toISOString(),
        expectedUpdatedAt: this.buildVersion(local.updatedAt, crossBorder.updatedAt),
      },
    };
  }

  private async readRequiredRule(input: {
    slug: string;
    ruleName: string;
    platformRatePercent: Prisma.Decimal | string;
    practitionerRatePercent: Prisma.Decimal | string;
    ruleScope: typeof LOCAL_DEFAULT.ruleScope;
    marketType: MarketType;
    sessionFlowType: null;
    sessionMode: null;
    priority: number;
    isDefault: boolean;
  }) {
    const existing = await this.commissionRuleRepository.findBySlug(input.slug);
    if (!existing || !existing.isActive) {
      throw new BadRequestException({
        messageKey: 'financialRules.errors.commissionRuleNotFound',
        error: 'FINANCIAL_RULE_COMMISSION_RULE_NOT_FOUND',
      });
    }
    this.validateCommissionRuleDefinitionService.validate({
      platformRatePercent: existing.platformRatePercent,
      practitionerRatePercent: existing.practitionerRatePercent,
    });
    return existing;
  }

  private toPercent(value: Prisma.Decimal | string) {
    return new Prisma.Decimal(value.toString()).toFixed(2);
  }

  private buildVersion(localUpdatedAt: Date, crossBorderUpdatedAt: Date) {
    return `${localUpdatedAt.toISOString()}|${crossBorderUpdatedAt.toISOString()}`;
  }
}

export {
  LOCAL_DEFAULT,
  CROSS_BORDER_DEFAULT,
  LOCAL_DEFAULT_SLUG,
  CROSS_BORDER_DEFAULT_SLUG,
};
