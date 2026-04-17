import { Injectable } from '@nestjs/common';
import { CommissionRuleScope, MarketType, Prisma } from '@prisma/client';
import { CommissionRuleRepository } from '../repositories/commission-rule.repository';
import { MoneyMathService } from '../services/money-math.service';
import { ValidateCommissionRuleDefinitionService } from '../services/validate-commission-rule-definition.service';

const LOCAL_DEFAULT_SLUG = 'revenue-share-default-local';
const CROSS_BORDER_DEFAULT_SLUG = 'revenue-share-default-cross-border';

@Injectable()
export class GetRevenueShareRulesUseCase {
  constructor(
    private readonly commissionRuleRepository: CommissionRuleRepository,
    private readonly validateCommissionRuleDefinitionService: ValidateCommissionRuleDefinitionService,
    private readonly moneyMathService: MoneyMathService,
  ) {}

  async execute() {
    const [local, crossBorder] = await Promise.all([
      this.ensureDefaultRule({
        slug: LOCAL_DEFAULT_SLUG,
        marketType: MarketType.LOCAL,
        platformRatePercent: '30.00',
        practitionerRatePercent: '70.00',
        ruleName: 'Default local revenue share',
      }),
      this.ensureDefaultRule({
        slug: CROSS_BORDER_DEFAULT_SLUG,
        marketType: MarketType.CROSS_BORDER,
        platformRatePercent: '50.00',
        practitionerRatePercent: '50.00',
        ruleName: 'Default cross-border revenue share',
      }),
    ]);

    return {
      item: {
        local: this.toRuleView(local),
        crossBorder: this.toRuleView(crossBorder),
      },
    };
  }

  private async ensureDefaultRule(input: {
    slug: string;
    ruleName: string;
    marketType: MarketType;
    platformRatePercent: Prisma.Decimal | string;
    practitionerRatePercent: Prisma.Decimal | string;
  }) {
    this.validateCommissionRuleDefinitionService.validate({
      platformRatePercent: input.platformRatePercent,
      practitionerRatePercent: input.practitionerRatePercent,
    });

    const platformRate = this.moneyMathService
      .toDecimal(input.platformRatePercent)
      .toFixed(2);
    const practitionerRate = this.moneyMathService
      .toDecimal(input.practitionerRatePercent)
      .toFixed(2);

    const rule = await this.commissionRuleRepository.upsertRuleBySlug({
      slug: input.slug,
      create: {
        slug: input.slug,
        ruleName: input.ruleName,
        ruleScope: CommissionRuleScope.GLOBAL,
        marketType: input.marketType,
        platformRatePercent: platformRate,
        practitionerRatePercent: practitionerRate,
        priority: 0,
        isDefault: true,
        isActive: true,
      },
      update: {
        ruleName: input.ruleName,
        ruleScope: CommissionRuleScope.GLOBAL,
        marketType: input.marketType,
        platformRatePercent: platformRate,
        practitionerRatePercent: practitionerRate,
        isDefault: true,
        isActive: true,
      },
    });

    await this.commissionRuleRepository.unsetOtherGlobalDefaults({
      marketType: input.marketType,
      keepSlug: input.slug,
    });

    return rule;
  }

  private toRuleView(rule: {
    id: string;
    slug: string;
    platformRatePercent: Prisma.Decimal;
    practitionerRatePercent: Prisma.Decimal;
    updatedAt: Date;
  }) {
    return {
      ruleId: rule.id,
      slug: rule.slug,
      platformRatePercent: rule.platformRatePercent.toString(),
      practitionerRatePercent: rule.practitionerRatePercent.toString(),
      updatedAt: rule.updatedAt.toISOString(),
    };
  }
}

export { LOCAL_DEFAULT_SLUG, CROSS_BORDER_DEFAULT_SLUG };

