import {
  CommissionRuleScope,
  MarketType,
  PrismaClient,
  SessionFlowType,
  SessionMode,
} from '@prisma/client';
import { SeedModule } from '../shared/seed.types';

export const financialRulesSeedModule: SeedModule = {
  name: 'financial-rules',
  async run(prisma: PrismaClient): Promise<void> {
    const rules = [
      {
        slug: 'session-booking-local-default',
        ruleName: 'Default local scheduled session commission',
        ruleScope: CommissionRuleScope.GLOBAL,
        marketType: MarketType.LOCAL,
        sessionFlowType: SessionFlowType.SCHEDULED,
        sessionMode: SessionMode.VIDEO,
        platformRatePercent: '20.00',
        practitionerRatePercent: '80.00',
        priority: 100,
        isDefault: true,
      },
      {
        slug: 'session-booking-cross-border-default',
        ruleName: 'Default cross-border scheduled session commission',
        ruleScope: CommissionRuleScope.GLOBAL,
        marketType: MarketType.CROSS_BORDER,
        sessionFlowType: SessionFlowType.SCHEDULED,
        sessionMode: SessionMode.VIDEO,
        platformRatePercent: '25.00',
        practitionerRatePercent: '75.00',
        priority: 100,
        isDefault: true,
      },
      {
        slug: 'session-booking-any-fallback',
        ruleName: 'Fallback scheduled session commission',
        ruleScope: CommissionRuleScope.GLOBAL,
        marketType: MarketType.ANY,
        sessionFlowType: SessionFlowType.SCHEDULED,
        sessionMode: SessionMode.VIDEO,
        platformRatePercent: '20.00',
        practitionerRatePercent: '80.00',
        priority: 10,
        isDefault: true,
      },
    ] as const;

    for (const rule of rules) {
      await prisma.commissionRule.upsert({
        where: { slug: rule.slug },
        create: {
          ...rule,
          isActive: true,
        },
        update: {
          ruleName: rule.ruleName,
          ruleScope: rule.ruleScope,
          marketType: rule.marketType,
          sessionFlowType: rule.sessionFlowType,
          sessionMode: rule.sessionMode,
          platformRatePercent: rule.platformRatePercent,
          practitionerRatePercent: rule.practitionerRatePercent,
          priority: rule.priority,
          isDefault: rule.isDefault,
          isActive: true,
        },
      });
    }
  },
};
