import { isDeepStrictEqual } from 'node:util';
import { ConfigScopeType } from '@prisma/client';
import { CONFIG_KEYS } from '@modules/config/registry/config-key.constants';
import type { UpdateConfigurationCommand } from '@modules/config/types/configuration-write.types';
import { paymobGatewayControlDraftSchema } from '../schemas/paymob-gateway-control.schema';

export const PAYMOB_PROVIDER_CONTROL_BOOTSTRAP_KEYS = [
  CONFIG_KEYS.payment.provider.paymob.enabled,
  CONFIG_KEYS.payment.provider.paymob.checkoutFlow,
  CONFIG_KEYS.payment.provider.paymob.defaultMethod,
  CONFIG_KEYS.payment.provider.paymob.methodRegistry,
  CONFIG_KEYS.payment.provider.paymob.maintenanceMode,
  CONFIG_KEYS.payment.provider.paymob.allowedCountries,
] as const;

const PAYMOB_PROVIDER_CONTROL_BOOTSTRAP_REASON =
  'Explicit operator bootstrap of the production Paymob EGP CARD provider control.';

export const PAYMOB_PROVIDER_CONTROL_BOOTSTRAP_SNAPSHOT = {
  enabled: true,
  checkoutFlow: 'legacy',
  defaultMethod: 'CARD',
  maintenanceMode: false,
  allowedCountryIsoCodes: ['EG'],
  methodRegistry: [
    {
      key: 'CARD',
      label: 'Card',
      type: 'CARD',
      enabled: true,
      priority: 100,
      supportedCheckoutFlows: ['legacy'],
      currencyCodes: ['EGP'],
      countryIsoCodes: ['EG'],
      integrationId: 'paymob-egp-card',
    },
  ],
};

const validatedSnapshot = paymobGatewayControlDraftSchema.parse(
  PAYMOB_PROVIDER_CONTROL_BOOTSTRAP_SNAPSHOT,
);

export type PaymobControlBootstrapAssessment =
  | { status: 'EMPTY'; message: string }
  | { status: 'SATISFIED'; message: string }
  | { status: 'PARTIAL'; message: string }
  | { status: 'CONFLICTING'; message: string };

export type ActivePaymobControlValues = ReadonlyMap<
  string,
  readonly unknown[]
>;

export function assessPaymobControlBootstrap(
  activeValues: ActivePaymobControlValues,
): PaymobControlBootstrapAssessment {
  const missing = PAYMOB_PROVIDER_CONTROL_BOOTSTRAP_KEYS.filter(
    (key) => !activeValues.has(key),
  );
  const duplicate = PAYMOB_PROVIDER_CONTROL_BOOTSTRAP_KEYS.filter(
    (key) => (activeValues.get(key)?.length ?? 0) > 1,
  );

  if (duplicate.length > 0) {
    return {
      status: 'CONFLICTING',
      message: `Refusing Paymob control bootstrap: duplicate active records exist for ${duplicate.join(', ')}.`,
    };
  }

  if (missing.length === PAYMOB_PROVIDER_CONTROL_BOOTSTRAP_KEYS.length) {
    return {
      status: 'EMPTY',
      message: 'No active Paymob provider-control records exist.',
    };
  }

  if (missing.length > 0) {
    const enabled = activeValues.get(
      CONFIG_KEYS.payment.provider.paymob.enabled,
    )?.[0];
    const suffix = enabled === false ? ' Existing enabled=false is authoritative.' : '';
    return {
      status: 'PARTIAL',
      message: `Refusing Paymob control bootstrap: active configuration is incomplete; missing ${missing.join(', ')}.${suffix}`,
    };
  }

  const actual = {
    enabled: activeValues.get(CONFIG_KEYS.payment.provider.paymob.enabled)?.[0],
    checkoutFlow: activeValues.get(
      CONFIG_KEYS.payment.provider.paymob.checkoutFlow,
    )?.[0],
    defaultMethod: activeValues.get(
      CONFIG_KEYS.payment.provider.paymob.defaultMethod,
    )?.[0],
    methodRegistry: activeValues.get(
      CONFIG_KEYS.payment.provider.paymob.methodRegistry,
    )?.[0],
    maintenanceMode: activeValues.get(
      CONFIG_KEYS.payment.provider.paymob.maintenanceMode,
    )?.[0],
    allowedCountryIsoCodes: activeValues.get(
      CONFIG_KEYS.payment.provider.paymob.allowedCountries,
    )?.[0],
  };

  if (isDeepStrictEqual(actual, validatedSnapshot)) {
    return {
      status: 'SATISFIED',
      message: 'Paymob provider-control bootstrap already satisfied; no changes made.',
    };
  }

  const enabled = actual.enabled === false ? ' Existing enabled=false is authoritative.' : '';
  return {
    status: 'CONFLICTING',
    message: `Refusing Paymob control bootstrap: active configuration conflicts with the production EGP CARD target.${enabled}`,
  };
}

export function assertPaymobControlBootstrapAllowed(input: {
  appEnv: string | undefined;
  databaseUrl: string | undefined;
  allowBootstrap: string | undefined;
}): 'production' | 'staging' {
  if (input.allowBootstrap !== 'true') {
    throw new Error(
      'Refusing Paymob control bootstrap. Set ALLOW_PAYMOB_CONTROL_BOOTSTRAP=true for an explicit operator run.',
    );
  }

  if (input.appEnv !== 'production' && input.appEnv !== 'staging') {
    throw new Error(
      'Refusing Paymob control bootstrap: APP_ENV must be production or staging.',
    );
  }

  if (!input.databaseUrl) {
    throw new Error(
      'Refusing Paymob control bootstrap: DATABASE_URL is required.',
    );
  }

  let hostname: string;
  try {
    hostname = new URL(input.databaseUrl).hostname.toLowerCase();
  } catch {
    throw new Error(
      'Refusing Paymob control bootstrap: DATABASE_URL is invalid.',
    );
  }

  if (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '::1' ||
    hostname === '[::1]' ||
    hostname.startsWith('127.')
  ) {
    throw new Error(
      'Refusing Paymob control bootstrap against a local database.',
    );
  }

  return input.appEnv;
}

export function createPaymobControlBootstrapCommands(
  expectedUpdatedAt: Date | null = null,
): UpdateConfigurationCommand[] {
  const scope = {
    scopeType: ConfigScopeType.GLOBAL,
    scopeRefId: null,
    actorType: 'DEPLOYMENT' as const,
    actor: {
      type: 'DEPLOYMENT' as const,
      permissions: ['configuration.system.write' as const],
    },
    reason: PAYMOB_PROVIDER_CONTROL_BOOTSTRAP_REASON,
    expectedUpdatedAt,
  };

  return [
    {
      ...scope,
      key: CONFIG_KEYS.payment.provider.paymob.enabled,
      value: validatedSnapshot.enabled,
    },
    {
      ...scope,
      key: CONFIG_KEYS.payment.provider.paymob.checkoutFlow,
      value: validatedSnapshot.checkoutFlow,
    },
    {
      ...scope,
      key: CONFIG_KEYS.payment.provider.paymob.defaultMethod,
      value: validatedSnapshot.defaultMethod ?? 'CARD',
    },
    {
      ...scope,
      key: CONFIG_KEYS.payment.provider.paymob.methodRegistry,
      value: validatedSnapshot.methodRegistry,
    },
    {
      ...scope,
      key: CONFIG_KEYS.payment.provider.paymob.maintenanceMode,
      value: validatedSnapshot.maintenanceMode,
    },
    {
      ...scope,
      key: CONFIG_KEYS.payment.provider.paymob.allowedCountries,
      value: validatedSnapshot.allowedCountryIsoCodes,
    },
  ];
}
