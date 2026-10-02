import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { CONFIG_DEFINITIONS } from './config.definitions';
import {
  PLATFORM_DEFAULTS,
  REQUIRED_DATABASE_CONFIG_DEFAULT_KEYS,
} from './platform-defaults';

describe('PLATFORM_DEFAULTS', () => {
  it('exposes canonical Paymob control defaults for database bootstrap', () => {
    expect(PLATFORM_DEFAULTS.paymobControl).toMatchObject({
      enabled: true,
      checkoutFlow: 'legacy',
      defaultMethod: 'CARD',
      maintenanceMode: false,
      allowedCountryIsoCodes: ['EG'],
    });
    expect(PLATFORM_DEFAULTS.paymobControl.methodRegistry).toEqual([
      expect.objectContaining({
        key: 'CARD',
        currencyCodes: ['EGP'],
        countryIsoCodes: ['EG'],
        integrationId: 'paymob-egp-card',
      }),
    ]);
    expect(PLATFORM_DEFAULTS.databaseConfig.map((definition) => definition.key)).toEqual(
      expect.arrayContaining([
        'payment.provider.paymob.enabled',
        'payment.provider.paymob.checkoutFlow',
        'payment.provider.paymob.defaultMethod',
        'payment.provider.paymob.methodRegistry',
        'payment.provider.paymob.maintenanceMode',
        'payment.provider.paymob.allowedCountries',
      ]),
    );
  });

  it('contains the mandatory revenue-share defaults and valid 100% splits', () => {
    expect(Number(PLATFORM_DEFAULTS.revenueShare.local.platformRatePercent)
      + Number(PLATFORM_DEFAULTS.revenueShare.local.practitionerRatePercent)).toBe(100);
    expect(Number(PLATFORM_DEFAULTS.revenueShare.crossBorder.platformRatePercent)
      + Number(PLATFORM_DEFAULTS.revenueShare.crossBorder.practitionerRatePercent)).toBe(100);
    expect(PLATFORM_DEFAULTS.revenueShare.local.marketType).toBe('LOCAL');
    expect(PLATFORM_DEFAULTS.revenueShare.crossBorder.marketType).toBe('CROSS_BORDER');
  });

  it('is the only bootstrap import surface for database config defaults', () => {
    expect(PLATFORM_DEFAULTS.configDefinitions).toBe(CONFIG_DEFINITIONS);
    expect(PLATFORM_DEFAULTS.databaseConfig).toEqual(
      CONFIG_DEFINITIONS.filter((definition) => definition.seed.createInitialValue === true),
    );
    expect(REQUIRED_DATABASE_CONFIG_DEFAULT_KEYS).toEqual(
      CONFIG_DEFINITIONS
        .filter((definition) => definition.seed.createInitialValue === true && definition.required)
        .map((definition) => definition.key),
    );
  });

  it('does not duplicate revenue-share percentages in seed or frontend code', () => {
    const seed = readFileSync(resolve(__dirname, '../../../../prisma/seed/modules/financial-rules.seed.ts'), 'utf8');
    const screen = readFileSync(resolve(__dirname, '../../../../../sawiyaa-frontend-v1/src/features/settings/components/AdminRevenueShareRulesScreen.tsx'), 'utf8');
    expect(seed).toContain('PLATFORM_DEFAULTS.revenueShare');
    expect(seed).not.toMatch(/platformRatePercent:\s*['"](?:30\.00|50\.00)['"]/);
    expect(screen).not.toMatch(/useState\(\s*['"](?:30|50)['"]\s*\)/);
  });
});
