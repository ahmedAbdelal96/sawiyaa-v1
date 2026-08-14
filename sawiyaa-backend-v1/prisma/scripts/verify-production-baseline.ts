import 'dotenv/config';
import { ConfigDataType, PrismaClient } from '@prisma/client';
import { CONFIG_KEYS } from '../../src/modules/config/registry/config-key.constants';
import { STANDARD_PACKAGE_PLANS } from '../../src/modules/package-plans/package-plan.catalog';
import { permissionDefinitions } from '../seed/modules/auth.permissions';
import { PRODUCTION_FINANCIAL_RULES } from '../seed/modules/financial-rules.seed';
import { PRODUCTION_BASELINE_SPECIALTIES, productionBaselineOperatorConfigKeys } from '../seed/production-baseline.seed';
import { assessPaymobControlBootstrap } from '../../src/modules/payment-gateway-control/bootstrap/paymob-provider-control-bootstrap.policy';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const blockers: string[] = [];
  const warnings: string[] = [];
  const [permissions, countries, specialties, plans, rules, catalogs, assessments, notificationTypes, activeConfigValues] = await Promise.all([
    prisma.permission.count({ where: { key: { in: permissionDefinitions.map((item) => item.key) } } }),
    prisma.country.count({ where: { isoCode: { in: ['EG', 'SA', 'AE', 'KW', 'QA'] }, isActive: true } }),
    prisma.specialty.findMany({ where: { slug: { in: PRODUCTION_BASELINE_SPECIALTIES.map((item) => item.specialty) }, isActive: true }, select: { slug: true } }),
    prisma.packagePlan.findMany({ where: { code: { in: STANDARD_PACKAGE_PLANS.map((item) => item.code) }, isActive: true }, select: { code: true } }),
    prisma.commissionRule.findMany({ where: { slug: { in: PRODUCTION_FINANCIAL_RULES.map((item) => item.slug) }, isActive: true } }),
    prisma.configKeyCatalog.findMany({ where: { key: { in: productionBaselineOperatorConfigKeys() } }, select: { key: true } }),
    prisma.assessmentDefinition.count({ where: { isPublished: true } }),
    prisma.notificationType.count(),
    prisma.configValue.findMany({
      where: {
        scopeType: 'GLOBAL',
        scopeRefId: null,
        isActive: true,
        configKey: { key: { in: productionBaselineOperatorConfigKeys() } },
      },
      include: { configKey: { select: { key: true, dataType: true } } },
    }),
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

  const activeValues = new Map<string, unknown[]>();
  for (const record of activeConfigValues) {
    let value: unknown;
    switch (record.configKey.dataType) {
      case ConfigDataType.BOOLEAN:
        value = record.valueBoolean;
        break;
      case ConfigDataType.NUMBER:
        value = record.valueNumber?.toNumber() ?? null;
        break;
      default:
        value = record.valueJson ?? record.valueString;
    }
    activeValues.set(record.configKey.key, [
      ...(activeValues.get(record.configKey.key) ?? []),
      value,
    ]);
  }
  const paymobAssessment = assessPaymobControlBootstrap(activeValues);
  if (paymobAssessment.status === 'EMPTY') blockers.push('OPERATOR_REQUIRED_PAYMOB_CONTROL');
  else if (paymobAssessment.status !== 'SATISFIED') blockers.push('INVALID_PAYMOB_CONTROL');

  const routes = activeValues.get(CONFIG_KEYS.payment.routing.currencyRoutes)?.[0];
  const hasEgpCardRoute = Array.isArray(routes) && routes.some((route) => {
    if (!route || typeof route !== 'object') return false;
    const item = route as Record<string, unknown>;
    return item.currencyCode === 'EGP' && item.paymentMethod === 'CARD' && item.provider === 'PAYMOB' && item.integrationKey === 'paymob-egp-card' && item.enabled === true;
  });
  if (!routes) blockers.push('OPERATOR_REQUIRED_PAYMENT_ROUTING');
  else if (!hasEgpCardRoute) blockers.push('INVALID_EGP_CARD_PAYMENT_ROUTING');

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
