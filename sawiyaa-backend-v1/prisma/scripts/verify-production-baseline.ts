import 'dotenv/config';
import { AuthProvider, ConfigDataType, PrismaClient, RefundPolicyType, UserRoleType, UserStatus } from '@prisma/client';
import { CONFIG_KEYS } from '../../src/modules/config/registry/config-key.constants';
import { STANDARD_PACKAGE_PLANS } from '../../src/modules/package-plans/package-plan.catalog';
import { permissionDefinitions, rolePermissionBundles } from '../seed/modules/auth.permissions';
import { PRODUCTION_FINANCIAL_RULES } from '../seed/modules/financial-rules.seed';
import { REQUIRED_DATABASE_CONFIG_DEFAULT_KEYS } from '../../src/modules/config/registry/platform-defaults';
import { PRODUCTION_BASELINE_LANGUAGES, PRODUCTION_BASELINE_SPECIALTIES, productionBaselineOperatorConfigKeys } from '../seed/production-baseline.seed';
import { assessPaymobControlBootstrap } from '../../src/modules/payment-gateway-control/bootstrap/paymob-provider-control-bootstrap.policy';
import { PRODUCTION_COUNTRY_CATALOG, REQUIRED_ARAB_COUNTRY_CODES, REQUIRED_MIDDLE_EAST_COUNTRY_CODES } from '../seed/modules/country-catalog';
import { PRODUCTION_NOTIFICATION_TEMPLATE_SLUGS, PRODUCTION_NOTIFICATION_TYPE_SLUGS, templatePlaceholders } from '../seed/modules/notification-baseline.contract';
import { REFUND_POLICY_KEYS } from '../../src/modules/refund-policies/refund-policy.catalog';
import { seedCredentials, seedIds } from '../seed/shared/seed.constants';
import { PRODUCTION_SESSION_CANCELLATION_POLICIES } from '../seed/modules/session-cancellation-policies.seed';

const prisma = new PrismaClient();

const KNOWN_DEVELOPMENT_FIXTURE_USER_IDS = [
  ...Object.values(seedIds.users),
  ...Object.values(seedIds.professionalContentFixtures.users),
];
const KNOWN_DEVELOPMENT_FIXTURE_EMAILS = [
  ...Object.values(seedCredentials).map((account) => account.email),
  'qa.admin@hesba.local',
  'finance@hesba.local',
  'practitioner.reviewer@hesba.local',
  'patient.ops@hesba.local',
  'marketing@hesba.local',
];

const EXPECTED_ROLE_PERMISSION_KEYS = rolePermissionBundles.flatMap((bundle) =>
  bundle.permissions.map((permission) => `${bundle.role}:${permission}`),
);

export function classifyPaymentRouting(routes: unknown): 'READY' | 'OPERATOR_SETUP_REQUIRED' | 'INVALID' {
  if (!routes) return 'OPERATOR_SETUP_REQUIRED';
  if (!Array.isArray(routes)) return 'INVALID';
  const hasEgpCardRoute = routes.some((route) => {
    if (!route || typeof route !== 'object') return false;
    const item = route as Record<string, unknown>;
    return item.currencyCode === 'EGP' && item.paymentMethod === 'CARD' && item.provider === 'PAYMOB' && item.integrationKey === 'paymob-egp-card' && item.enabled === true;
  });
  return hasEgpCardRoute ? 'READY' : 'INVALID';
}

export function collectSessionCancellationPolicyBlockers(
  cancellationPolicies: Array<{ bookingType: string; rules: Array<{ code: string }> }>,
): string[] {
  const blockers: string[] = [];
  for (const expectedPolicy of PRODUCTION_SESSION_CANCELLATION_POLICIES) {
    const policy = cancellationPolicies.find((item) => item.bookingType === expectedPolicy.bookingType);
    if (!policy) {
      blockers.push(`MISSING_SESSION_CANCELLATION_POLICY:${expectedPolicy.bookingType}`);
      continue;
    }
    const activeRuleCodes = new Set(policy.rules.map((rule) => rule.code));
    for (const expectedRule of expectedPolicy.rules) {
      if (!activeRuleCodes.has(expectedRule.code)) {
        blockers.push(`MISSING_SESSION_CANCELLATION_RULE:${expectedPolicy.bookingType}/${expectedRule.code}`);
      }
    }
  }
  return blockers;
}

async function main(): Promise<void> {
  const blockers: string[] = [];
  const warnings: string[] = [];
  const [permissions, rolePermissions, countries, languages, specialties, plans, rules, allRules, catalogs, assessments, notificationTypes, activeConfigValues, requiredConfigValues, initialAdminMatches, fixtureUsers, cancellationPolicies] = await Promise.all([
    prisma.permission.count({ where: { key: { in: permissionDefinitions.map((item) => item.key) } } }),
    prisma.rolePermission.findMany({
      where: { role: { in: rolePermissionBundles.map((bundle) => bundle.role) } },
      select: { role: true, permission: { select: { key: true } } },
    }),
    prisma.country.count({ where: { isoCode: { in: PRODUCTION_COUNTRY_CATALOG.map((item) => item.isoCode) }, isActive: true } }),
    prisma.language.findMany({
      where: { code: { in: PRODUCTION_BASELINE_LANGUAGES.map((item) => item.code) }, isActive: true },
      select: { code: true },
    }),
    prisma.specialty.findMany({ where: { slug: { in: PRODUCTION_BASELINE_SPECIALTIES.map((item) => item.specialty) }, isActive: true }, select: { slug: true } }),
    prisma.packagePlan.findMany({ where: { code: { in: STANDARD_PACKAGE_PLANS.map((item) => item.code) }, isActive: true }, select: { code: true } }),
    prisma.commissionRule.findMany({ where: { slug: { in: PRODUCTION_FINANCIAL_RULES.map((item) => item.slug) }, isActive: true } }),
    prisma.commissionRule.findMany({ where: { slug: { in: PRODUCTION_FINANCIAL_RULES.map((item) => item.slug) } } }),
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
    prisma.configValue.findMany({
      where: {
        scopeType: 'GLOBAL',
        scopeRefId: null,
        isActive: true,
        configKey: { key: { in: [...REQUIRED_DATABASE_CONFIG_DEFAULT_KEYS] } },
      },
      include: { configKey: { select: { key: true } } },
    }),
    process.env.PRODUCTION_INITIAL_ADMIN_EMAIL
      ? prisma.user.findMany({
          where: {
            emails: {
              some: {
                email: {
                  equals: process.env.PRODUCTION_INITIAL_ADMIN_EMAIL.trim().toLowerCase(),
                  mode: 'insensitive',
                },
              },
            },
          },
          select: {
            id: true,
            status: true,
            roles: { select: { role: true } },
            authIdentities: {
              where: { provider: AuthProvider.PASSWORD },
              select: { passwordHash: true, isEnabled: true },
            },
          },
        })
      : prisma.user.findMany({
          where: {
            status: UserStatus.ACTIVE,
            roles: { some: { role: UserRoleType.SUPER_ADMIN } },
            authIdentities: {
              some: { provider: AuthProvider.PASSWORD, isEnabled: true, passwordHash: { not: null } },
            },
          },
          select: {
            id: true,
            status: true,
            roles: { select: { role: true } },
            authIdentities: {
              where: { provider: AuthProvider.PASSWORD },
              select: { passwordHash: true, isEnabled: true },
            },
          },
        }),
    prisma.user.findMany({
      where: {
        OR: [
          { id: { in: KNOWN_DEVELOPMENT_FIXTURE_USER_IDS } },
          { emails: { some: { email: { in: KNOWN_DEVELOPMENT_FIXTURE_EMAILS } } } },
        ],
      },
      select: { id: true },
    }),
    prisma.sessionCancellationPolicy.findMany({
      where: { bookingType: { in: ['STANDARD', 'INSTANT'] }, isActive: true },
      select: { bookingType: true, rules: { where: { isActive: true }, select: { code: true } } },
    }),
  ]);

  const requiredConfigSet = new Set(requiredConfigValues.map((item) => item.configKey.key));
  for (const key of REQUIRED_DATABASE_CONFIG_DEFAULT_KEYS) {
    if (!requiredConfigSet.has(key)) blockers.push(`MISSING_REQUIRED_CONFIG:${key}`);
    else console.log(`OK:CONFIG:${key}`);
  }

  if (permissions !== permissionDefinitions.length) blockers.push('MISSING_PERMISSION_CATALOG');
  const rolePermissionSet = new Set(
    rolePermissions.map((row) => `${row.role}:${row.permission.key}`),
  );
  for (const key of EXPECTED_ROLE_PERMISSION_KEYS) {
    if (!rolePermissionSet.has(key)) blockers.push(`MISSING_ROLE_PERMISSION:${key}`);
  }
  const languageSet = new Set(languages.map((language) => language.code));
  for (const language of PRODUCTION_BASELINE_LANGUAGES) {
    if (!languageSet.has(language.code)) blockers.push(`MISSING_LANGUAGE:${language.code}`);
  }

  if (!process.env.PRODUCTION_INITIAL_ADMIN_EMAIL?.trim()) {
    if (initialAdminMatches.length === 0) blockers.push('INITIAL_ADMIN_SUPER_ADMIN_NOT_VERIFIED');
  } else if (initialAdminMatches.length !== 1) {
    blockers.push('INITIAL_ADMIN_IDENTITY_NOT_UNIQUE');
  } else {
    const initialAdmin = initialAdminMatches[0];
    if (initialAdmin.status !== UserStatus.ACTIVE) blockers.push('INITIAL_ADMIN_NOT_ACTIVE');
    if (!initialAdmin.roles.some((role) => role.role === UserRoleType.SUPER_ADMIN)) {
      blockers.push('INITIAL_ADMIN_SUPER_ADMIN_ROLE_MISSING');
    }
    if (
      initialAdmin.authIdentities.length !== 1 ||
      !initialAdmin.authIdentities[0].isEnabled ||
      !initialAdmin.authIdentities[0].passwordHash
    ) {
      blockers.push('INITIAL_ADMIN_PASSWORD_IDENTITY_NOT_USABLE');
    }
  }

  if (fixtureUsers.length > 0) blockers.push('KNOWN_DEVELOPMENT_FIXTURE_IDENTITY_PRESENT');
  blockers.push(...collectSessionCancellationPolicyBlockers(cancellationPolicies));

  const fixtureUserIds = fixtureUsers.map((user) => user.id);
  if (fixtureUserIds.length > 0) {
    const [patientProfiles, practitionerProfiles, sessions, payments, refunds, wallets, ledgerEntries, notifications] = await Promise.all([
      prisma.patientProfile.count({ where: { userId: { in: fixtureUserIds } } }),
      prisma.practitionerProfile.count({ where: { userId: { in: fixtureUserIds } } }),
      prisma.session.count({
        where: {
          OR: [
            { patient: { userId: { in: fixtureUserIds } } },
            { practitioner: { userId: { in: fixtureUserIds } } },
          ],
        },
      }),
      prisma.payment.count({
        where: {
          OR: [
            { patient: { userId: { in: fixtureUserIds } } },
            { practitioner: { userId: { in: fixtureUserIds } } },
          ],
        },
      }),
      prisma.refund.count({
        where: {
          payment: {
            OR: [
              { patient: { userId: { in: fixtureUserIds } } },
              { practitioner: { userId: { in: fixtureUserIds } } },
            ],
          },
        },
      }),
      prisma.customerWallet.count({ where: { patient: { userId: { in: fixtureUserIds } } } }),
      prisma.ledgerEntry.count({ where: { practitioner: { userId: { in: fixtureUserIds } } } }),
      prisma.notification.count({ where: { userId: { in: fixtureUserIds } } }),
    ]);
    if (patientProfiles || practitionerProfiles || sessions || payments || refunds || wallets || ledgerEntries || notifications) {
      blockers.push('KNOWN_DEVELOPMENT_FIXTURE_BUSINESS_DATA_PRESENT');
    }
  }

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
  const refundPolicies = await prisma.refundPolicy.findMany({
    where: { policyType: { in: [RefundPolicyType.SESSION, RefundPolicyType.PACKAGE] } },
    select: {
      policyType: true,
      key: true,
      isActive: true,
      clauses: { where: { isActive: true }, select: { id: true } },
    },
  });

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
  const refundPolicyMap = new Map(refundPolicies.map((policy) => [policy.policyType, policy]));
  for (const policyType of [RefundPolicyType.SESSION, RefundPolicyType.PACKAGE]) {
    const policy = refundPolicyMap.get(policyType);
    if (!policy) {
      blockers.push(`MISSING_REFUND_POLICY:${policyType}`);
    } else if (policy.key !== REFUND_POLICY_KEYS[policyType]) {
      blockers.push(`INVALID_REFUND_POLICY_KEY:${policyType}`);
    } else if (!policy.isActive || policy.clauses.length === 0) {
      blockers.push(`INCOMPLETE_REFUND_POLICY:${policyType}`);
    }
  }
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
      const existing = allRules.find((candidate) => candidate.slug === expected.slug);
      blockers.push(existing ? `INACTIVE_WHEN_MANDATORY:${expected.slug}` : `MISSING:${expected.slug}`);
      continue;
    }
    const total = rule.platformRatePercent.add(rule.practitionerRatePercent);
    if (!total.equals(100)) {
      blockers.push(`INVALID:${expected.slug}:SPLIT_SUM`);
    } else console.log(`OK:${expected.slug}`);
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
  const paymentRoutingStatus = classifyPaymentRouting(routes);
  if (paymentRoutingStatus === 'OPERATOR_SETUP_REQUIRED') warnings.push('PAYMENT_ROUTING_OPERATOR_SETUP_REQUIRED');
  else if (paymentRoutingStatus === 'INVALID') blockers.push('INVALID_EGP_CARD_PAYMENT_ROUTING');

  if (blockers.length > 0) {
    for (const blocker of [...new Set(blockers)]) console.error(blocker);
    process.exitCode = 1;
    return;
  }
  for (const warning of warnings) console.log(`WARNING ${warning}`);
  console.log('PRODUCTION_SEED_VALID');
}

if (require.main === module) {
  void main()
    .catch((error: unknown) => {
      console.error(error instanceof Error ? error.message : 'Production baseline verification failed.');
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
