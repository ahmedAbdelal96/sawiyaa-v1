const assert = require('node:assert/strict');
const test = require('node:test');
const { assertProductionBootstrapEnvironment, runProductionBootstrap } = require('./bootstrap-production');

const valid = {
  APP_ENV: 'production',
  DATABASE_URL: 'postgresql://app:secret@postgres:5432/sawiyaa',
  ALLOW_PRODUCTION_BASELINE_SEED: 'true',
};

test('production bootstrap requires explicit opt-in and production-like environment', () => {
  assert.doesNotThrow(() => assertProductionBootstrapEnvironment(valid));
  assert.throws(
    () => assertProductionBootstrapEnvironment({ ...valid, ALLOW_PRODUCTION_BASELINE_SEED: 'false' }),
    /explicit operator run/,
  );
  assert.throws(
    () => assertProductionBootstrapEnvironment({ ...valid, APP_ENV: 'development' }),
    /outside production or staging/,
  );
});

test('production bootstrap refuses local database targets', () => {
  assert.throws(
    () => assertProductionBootstrapEnvironment({ ...valid, DATABASE_URL: 'postgresql://app:secret@127.0.0.1:5432/sawiyaa' }),
    /local database/,
  );
});

test('disposable local bootstrap is staging-only and explicitly opt-in', () => {
  assert.doesNotThrow(() => assertProductionBootstrapEnvironment({
    ...valid,
    APP_ENV: 'staging',
    DATABASE_URL: 'postgresql://app:secret@127.0.0.1:5432/sawiyaa_disposable',
    ALLOW_DISPOSABLE_PRODUCTION_BOOTSTRAP: 'true',
  }));
  assert.throws(
    () => assertProductionBootstrapEnvironment({
      ...valid,
      DATABASE_URL: 'postgresql://app:secret@127.0.0.1:5432/sawiyaa_disposable',
      ALLOW_DISPOSABLE_PRODUCTION_BOOTSTRAP: 'true',
    }),
    /local database/,
  );
});

test('bootstrap invokes validation, migrations, seed, and verification in order', () => {
  const calls = [];
  runProductionBootstrap(valid, (script) => calls.push(script));
  assert.deepEqual(calls, [
    'config:validate:production',
    'prisma:migrate:deploy',
    'db:seed:production',
    'db:verify:production-ready',
  ]);
});

test('explicit payment opt-ins run before readiness verification', () => {
  const calls = [];
  runProductionBootstrap({
    ...valid,
    ALLOW_PAYMENT_ROUTE_BOOTSTRAP: 'true',
    ALLOW_PAYMOB_CONTROL_BOOTSTRAP: 'true',
  }, (script) => calls.push(script));
  assert.deepEqual(calls, [
    'config:validate:production',
    'prisma:migrate:deploy',
    'db:seed:production',
    'db:bootstrap:payment-routes',
    'db:bootstrap:paymob-provider-control',
    'db:verify:production-ready',
  ]);
});

test('bootstrap source does not contain destructive reset or push operations', () => {
  const source = require('node:fs').readFileSync(require.resolve('./bootstrap-production.js'), 'utf8');
  assert.doesNotMatch(source, /migrate\s+reset|db\s+push|DROP\s+DATABASE|deleteMany|delete\(/i);
});
