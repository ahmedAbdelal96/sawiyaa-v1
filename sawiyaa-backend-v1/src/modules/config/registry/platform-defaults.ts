import { CommissionRuleScope, MarketType } from '@prisma/client';
import { CONFIG_DEFINITIONS } from './config.definitions';

function databaseDefault(key: string): unknown {
  const definition = CONFIG_DEFINITIONS.find((item) => item.key === key);
  if (!definition || !('defaultValue' in definition)) {
    throw new Error(`Missing canonical default for ${key}`);
  }
  return definition.defaultValue;
}

const PAYMOB_CONTROL_DEFAULTS = Object.freeze({
  enabled: databaseDefault('payment.provider.paymob.enabled') as boolean,
  checkoutFlow: databaseDefault('payment.provider.paymob.checkoutFlow') as string,
  defaultMethod: databaseDefault('payment.provider.paymob.defaultMethod') as string,
  methodRegistry: databaseDefault('payment.provider.paymob.methodRegistry'),
  maintenanceMode: databaseDefault('payment.provider.paymob.maintenanceMode') as boolean,
  allowedCountryIsoCodes: databaseDefault('payment.provider.paymob.allowedCountries'),
});

/** Canonical values consumed by platform seed/bootstrap infrastructure. */
export const PLATFORM_DEFAULTS = Object.freeze({
  revenueShare: Object.freeze({
    local: Object.freeze({
      slug: 'revenue-share-default-local',
      ruleName: 'Default local revenue share',
      ruleScope: CommissionRuleScope.GLOBAL,
      marketType: MarketType.LOCAL,
      sessionFlowType: null,
      sessionMode: null,
      platformRatePercent: '30.00',
      practitionerRatePercent: '70.00',
      priority: 100,
      isDefault: true,
    }),
    crossBorder: Object.freeze({
      slug: 'revenue-share-default-cross-border',
      ruleName: 'Default cross-border revenue share',
      ruleScope: CommissionRuleScope.GLOBAL,
      marketType: MarketType.CROSS_BORDER,
      sessionFlowType: null,
      sessionMode: null,
      platformRatePercent: '50.00',
      practitionerRatePercent: '50.00',
      priority: 100,
      isDefault: true,
    }),
  }),
  configDefinitions: CONFIG_DEFINITIONS,
  paymobControl: PAYMOB_CONTROL_DEFAULTS,
  databaseConfig: Object.freeze(
    CONFIG_DEFINITIONS.filter((definition) => definition.seed.createInitialValue === true),
  ),
});

export const REQUIRED_REVENUE_SHARE_DEFAULTS = Object.freeze([
  PLATFORM_DEFAULTS.revenueShare.local,
  PLATFORM_DEFAULTS.revenueShare.crossBorder,
]);

export const REQUIRED_DATABASE_CONFIG_DEFAULT_KEYS = Object.freeze(
  PLATFORM_DEFAULTS.databaseConfig
    .filter((definition) => definition.required)
    .map((definition) => definition.key),
);
