import { ConfigScopeType } from '@prisma/client';
import {
  PAYMOB_PROVIDER_CONTROL_BOOTSTRAP_KEYS,
  PAYMOB_PROVIDER_CONTROL_BOOTSTRAP_SNAPSHOT,
  assessPaymobControlBootstrap,
  assertPaymobControlBootstrapAllowed,
  createPaymobControlBootstrapCommands,
} from './paymob-provider-control-bootstrap.policy';

function activeValues(
  overrides: Record<string, unknown> = {},
): Map<string, readonly unknown[]> {
  const snapshot = PAYMOB_PROVIDER_CONTROL_BOOTSTRAP_SNAPSHOT;
  return new Map([
    [PAYMOB_PROVIDER_CONTROL_BOOTSTRAP_KEYS[0], [overrides.enabled ?? snapshot.enabled]],
    [PAYMOB_PROVIDER_CONTROL_BOOTSTRAP_KEYS[1], [overrides.checkoutFlow ?? snapshot.checkoutFlow]],
    [PAYMOB_PROVIDER_CONTROL_BOOTSTRAP_KEYS[2], [overrides.defaultMethod ?? snapshot.defaultMethod]],
    [PAYMOB_PROVIDER_CONTROL_BOOTSTRAP_KEYS[3], [overrides.methodRegistry ?? snapshot.methodRegistry]],
    [PAYMOB_PROVIDER_CONTROL_BOOTSTRAP_KEYS[4], [overrides.maintenanceMode ?? snapshot.maintenanceMode]],
    [PAYMOB_PROVIDER_CONTROL_BOOTSTRAP_KEYS[5], [overrides.allowedCountryIsoCodes ?? snapshot.allowedCountryIsoCodes]],
  ]);
}

describe('Paymob provider-control bootstrap policy', () => {
  it('initializes only when the provider-control set is completely absent', () => {
    const empty = assessPaymobControlBootstrap(new Map());
    expect(empty.status).toBe('EMPTY');

    const commands = createPaymobControlBootstrapCommands();
    expect(commands.map((command) => command.key)).toEqual(
      expect.arrayContaining(PAYMOB_PROVIDER_CONTROL_BOOTSTRAP_KEYS),
    );
    expect(commands).toHaveLength(6);
  });

  it('is idempotent when every active value exactly matches the target', () => {
    expect(assessPaymobControlBootstrap(activeValues()).status).toBe('SATISFIED');
  });

  it('refuses partial and conflicting state, including explicit enabled=false', () => {
    const partial = activeValues();
    partial.delete(PAYMOB_PROVIDER_CONTROL_BOOTSTRAP_KEYS[3]);
    expect(assessPaymobControlBootstrap(partial).status).toBe('PARTIAL');
    expect(
      assessPaymobControlBootstrap(activeValues({ enabled: false })).status,
    ).toBe('CONFLICTING');
    expect(
      assessPaymobControlBootstrap(activeValues({ defaultMethod: 'WALLET' })).status,
    ).toBe('CONFLICTING');
  });

  it('writes only the Paymob EGP/CARD control shape and no secrets or USD settings', () => {
    const commands = createPaymobControlBootstrapCommands();
    const serialized = JSON.stringify(commands);
    expect(commands.every((command) => command.scopeType === ConfigScopeType.GLOBAL)).toBe(true);
    expect(commands.map((command) => command.key).join('|')).not.toMatch(/stripe|USD/i);
    expect(serialized).toContain('paymob-egp-card');
    expect(serialized).not.toMatch(/PAYMOB_(API_KEY|HMAC_SECRET|BASE_URL|IFRAME_ID)/);
    expect(PAYMOB_PROVIDER_CONTROL_BOOTSTRAP_SNAPSHOT).toMatchObject({
      enabled: true,
      checkoutFlow: 'legacy',
      defaultMethod: 'CARD',
      maintenanceMode: false,
      allowedCountryIsoCodes: ['EG'],
      methodRegistry: [{ key: 'CARD', currencyCodes: ['EGP'], supportedCheckoutFlows: ['legacy'] }],
    });
  });

  it('requires explicit production/staging opt-in and a non-local database', () => {
    expect(() =>
      assertPaymobControlBootstrapAllowed({
        appEnv: 'production',
        databaseUrl: 'postgresql://db/app',
        allowBootstrap: undefined,
      }),
    ).toThrow(/ALLOW_PAYMOB_CONTROL_BOOTSTRAP/);
    expect(() =>
      assertPaymobControlBootstrapAllowed({
        appEnv: 'development',
        databaseUrl: 'postgresql://db/app',
        allowBootstrap: 'true',
      }),
    ).toThrow(/production or staging/);
    expect(() =>
      assertPaymobControlBootstrapAllowed({
        appEnv: 'production',
        databaseUrl: 'postgresql://127.0.0.1/app',
        allowBootstrap: 'true',
      }),
    ).toThrow(/local database/);
  });
});
