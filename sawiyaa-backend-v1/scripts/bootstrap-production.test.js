const assert = require('node:assert/strict');
const test = require('node:test');
const { assertProductionBootstrapEnvironment } = require('./bootstrap-production');

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
