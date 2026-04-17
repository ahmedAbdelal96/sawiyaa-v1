import { Injectable } from '@nestjs/common';
import { CommissionRuleScope, MarketType } from '@prisma/client';
import { CommissionRuleRepository } from '../repositories/commission-rule.repository';
import { MoneyMathService } from '../services/money-math.service';
import { ValidateCommissionRuleDefinitionService } from '../services/validate-commission-rule-definition.service';
import { UpdateRevenueShareRulesDto } from '../dto/revenue-share-rules.dto';
import {
  CROSS_BORDER_DEFAULT_SLUG,
  LOCAL_DEFAULT_SLUG,
} from './get-revenue-share-rules.use-case';

@Injectable()
export class UpdateRevenueShareRulesUseCase {
  constructor(
    private readonly commissionRuleRepository: CommissionRuleRepository,
    private readonly validateCommissionRuleDefinitionService: ValidateCommissionRuleDefinitionService,
    private readonly moneyMathService: MoneyMathService,
  ) {}

  async execute(body: UpdateRevenueShareRulesDto) {
    this.validateCommissionRuleDefinitionService.validate({
      platformRatePercent: body.localPlatformRatePercent,
      practitionerRatePercent: body.localPractitionerRatePercent,
    });
    this.validateCommissionRuleDefinitionService.validate({
      platformRatePercent: body.crossBorderPlatformRatePercent,
      practitionerRatePercent: body.crossBorderPractitionerRatePercent,
    });

    const [local, crossBorder] = await Promise.all([
      this.commissionRuleRepository.upsertRuleBySlug({
        slug: LOCAL_DEFAULT_SLUG,
        create: {
          slug: LOCAL_DEFAULT_SLUG,
          ruleName: 'Default local revenue share',
          ruleScope: CommissionRuleScope.GLOBAL,
          marketType: MarketType.LOCAL,
          platformRatePercent: this.moneyMathService
            .toDecimal(body.localPlatformRatePercent)
            .toFixed(2),
          practitionerRatePercent: this.moneyMathService
            .toDecimal(body.localPractitionerRatePercent)
            .toFixed(2),
          priority: 0,
          isDefault: true,
          isActive: true,
        },
        update: {
          platformRatePercent: this.moneyMathService
            .toDecimal(body.localPlatformRatePercent)
            .toFixed(2),
          practitionerRatePercent: this.moneyMathService
            .toDecimal(body.localPractitionerRatePercent)
            .toFixed(2),
          isDefault: true,
          isActive: true,
        },
      }),
      this.commissionRuleRepository.upsertRuleBySlug({
        slug: CROSS_BORDER_DEFAULT_SLUG,
        create: {
          slug: CROSS_BORDER_DEFAULT_SLUG,
          ruleName: 'Default cross-border revenue share',
          ruleScope: CommissionRuleScope.GLOBAL,
          marketType: MarketType.CROSS_BORDER,
          platformRatePercent: this.moneyMathService
            .toDecimal(body.crossBorderPlatformRatePercent)
            .toFixed(2),
          practitionerRatePercent: this.moneyMathService
            .toDecimal(body.crossBorderPractitionerRatePercent)
            .toFixed(2),
          priority: 0,
          isDefault: true,
          isActive: true,
        },
        update: {
          platformRatePercent: this.moneyMathService
            .toDecimal(body.crossBorderPlatformRatePercent)
            .toFixed(2),
          practitionerRatePercent: this.moneyMathService
            .toDecimal(body.crossBorderPractitionerRatePercent)
            .toFixed(2),
          isDefault: true,
          isActive: true,
        },
      }),
    ]);

    await Promise.all([
      this.commissionRuleRepository.unsetOtherGlobalDefaults({
        marketType: MarketType.LOCAL,
        keepSlug: LOCAL_DEFAULT_SLUG,
      }),
      this.commissionRuleRepository.unsetOtherGlobalDefaults({
        marketType: MarketType.CROSS_BORDER,
        keepSlug: CROSS_BORDER_DEFAULT_SLUG,
      }),
    ]);

    return {
      item: {
        local: {
          ruleId: local.id,
          slug: local.slug,
          platformRatePercent: local.platformRatePercent.toString(),
          practitionerRatePercent: local.practitionerRatePercent.toString(),
          updatedAt: local.updatedAt.toISOString(),
        },
        crossBorder: {
          ruleId: crossBorder.id,
          slug: crossBorder.slug,
          platformRatePercent: crossBorder.platformRatePercent.toString(),
          practitionerRatePercent: crossBorder.practitionerRatePercent.toString(),
          updatedAt: crossBorder.updatedAt.toISOString(),
        },
      },
    };
  }
}
