import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { CONFIG_KEYS } from '../../src/modules/config/registry/config-key.constants';
import { STANDARD_PACKAGE_PLANS } from '../../src/modules/package-plans/package-plan.catalog';
import { permissionDefinitions } from '../seed/modules/auth.permissions';
import { PRODUCTION_FINANCIAL_RULES } from '../seed/modules/financial-rules.seed';
import { PRODUCTION_BASELINE_SPECIALTIES, productionBaselineOperatorConfigKeys } from '../seed/production-baseline.seed';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const blockers: string[] = [];
  const warnings: string[] = [];
  const [permissions, countries, specialties, plans, rules, catalogs, assessments, notificationTypes] = await Promise.all([
    prisma.permission.count({ where: { key: { in: permissionDefinitions.map((item) => item.key) } } }),
    prisma.country.count({ where: { isoCode: { in: ['EG', 'SA', 'AE', 'KW', 'QA'] }, isActive: true } }),
    prisma.specialty.findMany({ where: { slug: { in: PRODUCTION_BASELINE_SPECIALTIES.map((item) => item.specialty) }, isActive: true }, select: { slug: true } }),
    prisma.packagePlan.findMany({ where: { code: { in: STANDARD_PACKAGE_PLANS.map((item) => item.code) }, isActive: true }, select: { code: true } }),
    prisma.commissionRule.findMany({ where: { slug: { in: PRODUCTION_FINANCIAL_RULES.map((item) => item.slug) }, isActive: true } }),
    prisma.configKeyCatalog.findMany({ where: { key: { in: productionBaselineOperatorConfigKeys() } }, select: { key: true } }),
    prisma.assessmentDefinition.count({ where: { isPublished: true } }),
    prisma.notificationType.count(),
  ]);

  if (permissions !== permissionDefinitions.length) blockers.push('MISSING_PERMISSION_CATALOG');
  if (countries !== 5) blockers.push('MISSING_COUNTRY_CATALOG');
  if (specialties.length !== PRODUCTION_BASELINE_SPECIALTIES.length) blockers.push('MISSING_SPECIALTY_CATALOG');
  if (plans.length !== STANDARD_PACKAGE_PLANS.length) blockers.push('MISSING_PACKAGE_PLAN_CATALOG');
  if (assessments === 0) blockers.push('MISSING_ASSESSMENT_CATALOG');
  if (notificationTypes === 0) blockers.push('MISSING_NOTIFICATION_CATALOG');
  for (const expected of PRODUCTION_FINANCIAL_RULES) {
    const rule = rules.find((candidate) => candidate.slug === expected.slug);
    if (!rule) {
      blockers.push('MISSING_COMMISSION_RULE');
      continue;
    }
    if (rule.platformRatePercent.toFixed(2) !== expected.platformRatePercent || rule.practitionerRatePercent.toFixed(2) !== expected.practitionerRatePercent) {
      blockers.push(`CONFLICTING_COMMISSION_RULE:${expected.slug}`);
    }
  }
  const catalogKeys = new Set(catalogs.map((item) => item.key));
  if (!catalogKeys.has(CONFIG_KEYS.payment.routing.currencyRoutes)) blockers.push('MISSING_PAYMENT_ROUTING_CATALOG');
  if (!catalogKeys.has(CONFIG_KEYS.payment.provider.paymob.enabled)) blockers.push('MISSING_PAYMOB_CONTROL_CATALOG');
  warnings.push('PAYMOB_CONTROL_AND_ROUTING_VALUES_REMAIN_OPERATOR_OWNED');

  if (blockers.length > 0) {
    for (const blocker of [...new Set(blockers)]) console.error(blocker);
    process.exitCode = 1;
    return;
  }
  for (const warning of warnings) console.log(`WARNING ${warning}`);
  console.log('PRODUCTION_SEED_VALID');
}

void main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : 'Production baseline verification failed.');
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
