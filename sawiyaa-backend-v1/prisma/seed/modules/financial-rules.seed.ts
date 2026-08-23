import { PrismaClient } from '@prisma/client';
import { PLATFORM_DEFAULTS } from '../../../src/modules/config/registry/platform-defaults';
import { SeedModule } from '../shared/seed.types';

export const PRODUCTION_FINANCIAL_RULES = [
  PLATFORM_DEFAULTS.revenueShare.local,
  PLATFORM_DEFAULTS.revenueShare.crossBorder,
] as const;

export const LEGACY_PRODUCTION_FINANCIAL_RULE_SLUGS = [
  'session-booking-local-default',
  'session-booking-cross-border-default',
  'session-booking-any-fallback',
  'session-booking-instant-default',
] as const;

export async function ensureProductionFinancialRules(
  prisma: PrismaClient,
): Promise<{ created: number; preserved: number }> {
  let created = 0;
  let preserved = 0;
  for (const rule of PRODUCTION_FINANCIAL_RULES) {
    const existing = await prisma.commissionRule.findUnique({
      where: { slug: rule.slug },
      select: { id: true, isActive: true },
    });
    if (existing) {
      if (!existing.isActive) {
        await prisma.commissionRule.update({
          where: { id: existing.id },
          data: { isActive: true },
        });
      }
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

export async function deactivateLegacyProductionFinancialRules(
  prisma: PrismaClient,
): Promise<number> {
  const result = await prisma.commissionRule.updateMany({
    where: {
      slug: { in: [...LEGACY_PRODUCTION_FINANCIAL_RULE_SLUGS] },
      isDefault: true,
    },
    data: { isActive: false },
  });
  return result.count;
}

export const financialRulesSeedModule: SeedModule = {
  name: 'financial-rules',
  async run(prisma: PrismaClient): Promise<void> {
    await ensureProductionFinancialRules(prisma);
    await deactivateLegacyProductionFinancialRules(prisma);
  },
};
