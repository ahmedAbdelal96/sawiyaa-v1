import 'dotenv/config';
import { ConfigDataType, PrismaClient } from '@prisma/client';
import { CONFIG_KEYS } from '../../src/modules/config/registry/config-key.constants';
import { STANDARD_PACKAGE_PLANS } from '../../src/modules/package-plans/package-plan.catalog';
import { permissionDefinitions } from '../seed/modules/auth.permissions';
import { PRODUCTION_FINANCIAL_RULES } from '../seed/modules/financial-rules.seed';
import { PRODUCTION_BASELINE_SPECIALTIES, productionBaselineOperatorConfigKeys } from '../seed/production-baseline.seed';
import { assessPaymobControlBootstrap } from '../../src/modules/payment-gateway-control/bootstrap/paymob-provider-control-bootstrap.policy';
import { PRODUCTION_COUNTRY_CATALOG, REQUIRED_ARAB_COUNTRY_CODES, REQUIRED_MIDDLE_EAST_COUNTRY_CODES } from '../seed/modules/country-catalog';
import { PRODUCTION_NOTIFICATION_TEMPLATE_SLUGS, PRODUCTION_NOTIFICATION_TYPE_SLUGS, templatePlaceholders } from '../seed/modules/notification-baseline.contract';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const blockers: string[] = [];
  const warnings: string[] = [];
  const [permissions, countries, specialties, plans, rules, catalogs, assessments, notificationTypes, activeConfigValues] = await Promise.all([
    prisma.permission.count({ where: { key: { in: permissionDefinitions.map((item) => item.key) } } }),
    prisma.country.count({ where: { isoCode: { in: PRODUCTION_COUNTRY_CATALOG.map((item) => item.isoCode) }, isActive: true } }),
    prisma.specialty.findMany({ where: { slug: { in: PRODUCTION_BASELINE_SPECIALTIES.map((item) => item.specialty) }, isActive: true }, select: { slug: true } }),
    prisma.packagePlan.findMany({ where: { code: { in: STANDARD_PACKAGE_PLANS.map((item) => item.code) }, isActive: true }, select: { code: true } }),
    prisma.commissionRule.findMany({ where: { slug: { in: PRODUCTION_FINANCIAL_RULES.map((item) => item.slug) }, isActive: true } }),
    prisma.configKeyCatalog.findMany({ where: { key: { in: productionBaselineOperatorConfigKeys() } }, select: { key: true } }),
    prisma.assessmentDefinition.count({ where: { isPublished: true } }),
    prisma.notificationType.findMany({
      where: { slug: { in: [...PRODUCTION_NOTIFICATION_TYPE_SLUGS] } },
      select: { slug: true },
    }),
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

  const [arabCountries, middleEastCountries, notificationTemplates] = await Promise.all([
    prisma.country.findMany({ where: { isoCode: { in: [...REQUIRED_ARAB_COUNTRY_CODES] }, isActive: true }, select: { isoCode: true } }),
    prisma.country.findMany({ where: { isoCode: { in: [...REQUIRED_MIDDLE_EAST_COUNTRY_CODES] }, isActive: true }, select: { isoCode: true } }),
    prisma.notificationTemplate.findMany({
      where: { slug: { in: [...PRODUCTION_NOTIFICATION_TEMPLATE_SLUGS] }, isActive: true },
      select: {
        slug: true,
        channel: true,
        notificationTypeId: true,
        notificationType: { select: { supportsEmail: true, supportsSms: true, supportsPush: true, supportsInApp: true } },
        translations: { select: { locale: true, subjectTemplate: true, titleTemplate: true, bodyTemplate: true } },
      },
    }),
  ]);

  if (permissions !== permissionDefinitions.length) blockers.push('MISSING_PERMISSION_CATALOG');
  if (countries !== PRODUCTION_COUNTRY_CATALOG.length) blockers.push('MISSING_COUNTRY_CATALOG');
  const arabSet = new Set(arabCountries.map((item) => item.isoCode));
  for (const code of REQUIRED_ARAB_COUNTRY_CODES) if (!arabSet.has(code)) blockers.push(`MISSING_ARAB_COUNTRY:${code}`);
  const middleEastSet = new Set(middleEastCountries.map((item) => item.isoCode));
  for (const code of REQUIRED_MIDDLE_EAST_COUNTRY_CODES) if (!middleEastSet.has(code)) blockers.push(`MISSING_MIDDLE_EAST_COUNTRY:${code}`);
  if (specialties.length !== PRODUCTION_BASELINE_SPECIALTIES.length) blockers.push('MISSING_SPECIALTY_CATALOG');
  if (plans.length !== STANDARD_PACKAGE_PLANS.length) blockers.push('MISSING_PACKAGE_PLAN_CATALOG');
  if (assessments === 0) blockers.push('MISSING_ASSESSMENT_CATALOG');
  if (notificationTypes.length !== PRODUCTION_NOTIFICATION_TYPE_SLUGS.length) blockers.push('MISSING_NOTIFICATION_TYPE_CATALOG');
  const templateMap = new Map(notificationTemplates.map((template) => [template.slug, template]));
  const activeChannelKeys = new Set<string>();
  for (const slug of PRODUCTION_NOTIFICATION_TEMPLATE_SLUGS) {
    const template = templateMap.get(slug);
    if (!template) {
      blockers.push(`MISSING_NOTIFICATION_TEMPLATE:${slug}`);
      continue;
    }
    const channelKey = `${template.notificationTypeId}:${template.channel}`;
    if (activeChannelKeys.has(channelKey)) blockers.push(`DUPLICATE_ACTIVE_NOTIFICATION_CHANNEL:${template.channel}`);
    activeChannelKeys.add(channelKey);
    const supported = template.channel === 'EMAIL'
      ? template.notificationType.supportsEmail
      : template.channel === 'SMS'
        ? template.notificationType.supportsSms
        : template.channel === 'PUSH'
          ? template.notificationType.supportsPush
          : template.notificationType.supportsInApp;
    if (!supported) blockers.push(`UNSUPPORTED_NOTIFICATION_CHANNEL:${slug}`);
    const locales = new Map(template.translations.map((translation) => [translation.locale, translation]));
    for (const locale of ['en', 'ar']) {
      const translation = locales.get(locale);
      if (!translation || !translation.titleTemplate || !translation.bodyTemplate) blockers.push(`INCOMPLETE_NOTIFICATION_TRANSLATION:${slug}:${locale}`);
    }
    const en = locales.get('en');
    const ar = locales.get('ar');
    if (en && ar) {
      const enPlaceholders = JSON.stringify([
        ...templatePlaceholders(en.subjectTemplate),
        ...templatePlaceholders(en.titleTemplate),
        ...templatePlaceholders(en.bodyTemplate),
      ]);
      const arPlaceholders = JSON.stringify([
        ...templatePlaceholders(ar.subjectTemplate),
        ...templatePlaceholders(ar.titleTemplate),
        ...templatePlaceholders(ar.bodyTemplate),
      ]);
      if (enPlaceholders !== arPlaceholders) blockers.push(`MISMATCHED_NOTIFICATION_PLACEHOLDERS:${slug}`);
    }
  }
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
