import {
  CommissionRuleScope,
  MarketType,
  PrismaClient,
  SessionFlowType,
  SessionMode,
} from '@prisma/client';
import { SeedModule } from '../shared/seed.types';

export const PRODUCTION_FINANCIAL_RULES = [
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
  {
    slug: 'session-booking-instant-default',
    ruleName: 'Default instant booking commission',
    ruleScope: CommissionRuleScope.GLOBAL,
    marketType: MarketType.ANY,
    sessionFlowType: SessionFlowType.INSTANT,
    sessionMode: SessionMode.VIDEO,
    platformRatePercent: '20.00',
    practitionerRatePercent: '80.00',
    priority: 100,
    isDefault: true,
  },
] as const;

export async function ensureProductionFinancialRules(
  prisma: PrismaClient,
): Promise<{ created: number; preserved: number }> {
  let created = 0;
  let preserved = 0;
  for (const rule of PRODUCTION_FINANCIAL_RULES) {
    const existing = await prisma.commissionRule.findUnique({
      where: { slug: rule.slug },
      select: { id: true },
    });
    if (existing) {
      preserved += 1;
      continue;
    }
    await prisma.commissionRule.create({
      data: { ...rule, isActive: true },
    });
    created += 1;
  }
  return { created, preserved };
}

export const financialRulesSeedModule: SeedModule = {
  name: 'financial-rules',
  async run(prisma: PrismaClient): Promise<void> {
    for (const rule of PRODUCTION_FINANCIAL_RULES) {
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
