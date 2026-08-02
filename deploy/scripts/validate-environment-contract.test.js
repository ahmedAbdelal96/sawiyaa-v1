'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const childProcess = require('node:child_process');
const test = require('node:test');
const {
  STATUS,
  validateEnvironment,
  formatReport,
  classifyGitPaths,
  isAllowedOperationalPath,
  isGeoIpReady,
  diskSpaceIsSufficient,
} = require('./validate-environment-contract.js');

function fixtureDirectory() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'sawiyaa-env-contract-'));
}

function writeEnv(directory, name, values) {
  const file = path.join(directory, name);
  fs.writeFileSync(file, Object.entries(values).map(([key, value]) => `${key}=${value}`).join('\n'), { mode: 0o600 });
  return file;
}

function completeFixture(directory, overrides = {}) {
  const backend = writeEnv(directory, 'backend.env', {
    APP_ENV: 'production', NODE_ENV: 'production', APP_URL: 'https://sawiyaa.test',
    DATABASE_URL: 'postgresql://dbuser:valid-pass@localhost:5432/sawiyaa',
    JWT_ACCESS_SECRET: 'a'.repeat(32), JWT_REFRESH_SECRET: 'b'.repeat(32),
    GEOIP_ENABLED: 'false', PAYMENT_PAYMOB_ENABLED: 'false',
    ...overrides.backend,
  });
  const frontend = writeEnv(directory, 'frontend.env', {
    NEXT_PUBLIC_API_URL: '/api/v1', NEXT_PUBLIC_APP_URL: 'https://sawiyaa.test', API_PROXY_TARGET: 'http://backend:7000',
    ...overrides.frontend,
  });
  const db = writeEnv(directory, 'db.env', {
    POSTGRES_DB: 'sawiyaa', POSTGRES_USER: 'sawiyaa', POSTGRES_PASSWORD: 'safe-local-fixture',
    ...overrides.db,
  });
  return { backend, frontend, db, backendEnv: backend, frontendEnv: frontend, dbEnv: db };
}

function validate(overrides = {}) {
  const directory = fixtureDirectory();
  const files = completeFixture(directory, overrides);
  const result = validateEnvironment({ ...files, environment: 'production' });
  return { directory, files, result };
}

test('required variable missing is blocking', () => {
  const directory = fixtureDirectory();
  const files = completeFixture(fixtureDirectory());
  const text = fs.readFileSync(files.backend, 'utf8').replace(/^DATABASE_URL=.*\n?/m, '');
  fs.writeFileSync(files.backend, text);
  assert.equal(validateEnvironment({ ...files, environment: 'production' }).blocking, true);
});

test('optional variable missing is not blocking', () => {
  const { result } = validate();
  assert.equal(result.blocking, false);
  assert.match(formatReport(result), /NOT_REQUIRED/);
});

test('conditional GeoIP requirement is enforced', () => {
  const { result } = validate({ backend: { GEOIP_ENABLED: 'true' } });
  assert.match(formatReport(result), /MISSING GEOIP_DATABASE_PATH/);
  assert.equal(result.blocking, true);
});

test('empty required secret is blocking and redacted', () => {
  const { result } = validate({ backend: { JWT_ACCESS_SECRET: '' } });
  const report = formatReport(result);
  assert.match(report, /EMPTY JWT_ACCESS_SECRET/);
  assert.doesNotMatch(report, /a{10,}|valid-pass/);
});

test('placeholder values are detected without printing values', () => {
  const { result } = validate({ backend: { JWT_ACCESS_SECRET: '<change-me>' } });
  const report = formatReport(result);
  assert.match(report, /PLACEHOLDER JWT_ACCESS_SECRET/);
  assert.doesNotMatch(report, /change-me/);
});

test('unknown and duplicate variables are detected', () => {
  const directory = fixtureDirectory();
  const files = completeFixture(directory);
  fs.appendFileSync(files.backend, '\nUNKNOWN_PRODUCTION_FLAG=true\nAPP_ENV=production\n');
  const report = formatReport(validateEnvironment({ ...files, environment: 'production' }));
  assert.match(report, /UNKNOWN UNKNOWN_PRODUCTION_FLAG/);
  assert.match(report, /CONFLICT APP_ENV/);
});

test('canonical and legacy Paymob conflict is blocking', () => {
  const { result } = validate({ backend: {
    PAYMENT_PAYMOB_ENABLED: 'true', PAYMOB_MODE: 'test', PAYMOB_API_KEY: 'api', PAYMOB_HMAC_SECRET: 'hmac',
    PAYMOB_BASE_URL: 'https://accept.paymob.com/api', PAYMOB_EGP_CARD_INTEGRATION_ID: 'canonical', PAYMOB_INTEGRATION_ID_CARD: 'legacy',
  } });
  assert.match(formatReport(result), /CONFLICT PAYMOB_EGP_CARD_INTEGRATION_ID/);
});

test('optional USD integration may remain empty', () => {
  const { result } = validate({ backend: { PAYMENT_PAYMOB_ENABLED: 'false', PAYMOB_USD_CARD_INTEGRATION_ID: '' } });
  assert.doesNotMatch(formatReport(result), /MISSING PAYMOB_USD_CARD_INTEGRATION_ID/);
});

test('database-authoritative route JSON is forbidden', () => {
  const { result } = validate({ backend: { PAYMENT_PROVIDER_ROUTES_JSON: '{}' } });
  assert.match(formatReport(result), /CONFLICT PAYMENT_PROVIDER_ROUTES_JSON/);
});

test('frontend variables are classified as build-time and missing is blocking', () => {
  const { result } = validate({ frontend: { NEXT_PUBLIC_API_URL: '' } });
  assert.match(formatReport(result), /EMPTY NEXT_PUBLIC_API_URL/);
  assert.equal(result.blocking, true);
});

test('new target-release required frontend variable is blocking', () => {
  const { files } = validate();
  const targetContract = { entries: [
    { name: 'NEXT_PUBLIC_NEW_REQUIRED_FLAG', service: 'frontend', required: true },
  ] };
  const result = validateEnvironment({
    ...files,
    contract: targetContract,
    knownNames: new Set(['NEXT_PUBLIC_NEW_REQUIRED_FLAG']),
    environment: 'production',
  });
  assert.match(formatReport(result), /MISSING NEXT_PUBLIC_NEW_REQUIRED_FLAG/);
  assert.equal(result.blocking, true);
});

test('removed target-release variable is blocking when no deprecation policy exists', () => {
  const { files } = validate({ backend: { REMOVED_BY_TARGET: 'stale' } });
  const result = validateEnvironment({ ...files, environment: 'production', knownNames: new Set() });
  assert.match(formatReport(result), /UNKNOWN REMOVED_BY_TARGET/);
  assert.equal(result.blocking, true);
});

test('removed variable retained in the contract is blocking unless explicitly deprecated', () => {
  const { files } = validate({ backend: { REMOVED_BY_TARGET: 'stale' } });
  const result = validateEnvironment({
    ...files,
    environment: 'production',
    knownNames: new Set(),
    contract: { entries: [{ name: 'REMOVED_BY_TARGET', service: 'backend', required: false }] },
  });
  assert.match(formatReport(result), /UNKNOWN REMOVED_BY_TARGET/);
  assert.equal(result.blocking, true);
});

test('configured renamed alias is reported as deprecated without printing its value', () => {
  const { files } = validate({ backend: { PAYMOB_INTEGRATION_ID_CARD: 'legacy-secret' } });
  const result = validateEnvironment({ ...files, environment: 'production' });
  const report = formatReport(result);
  assert.match(report, /DEPRECATED PAYMOB_INTEGRATION_ID_CARD/);
  assert.doesNotMatch(report, /legacy-secret/);
});

test('Git tracked dirty and untracked policies are deterministic', () => {
  const result = classifyGitPaths([' M src/app.ts', '?? deploy/certs/cert.pem', '?? deploy-build.pid', '?? src/new.ts'], ['deploy/certs/', 'deploy/certbot-logs/', 'deploy-build.pid', '*.before-*']);
  assert.equal(result[0].status, 'BLOCKING_TRACKED_DIRTY');
  assert.equal(result[1].status, 'ALLOWED_UNTRACKED');
  assert.equal(result[2].status, 'ALLOWED_UNTRACKED');
  assert.equal(result[3].status, 'BLOCKING_UNEXPECTED_UNTRACKED');
  assert.equal(isAllowedOperationalPath('src/new.ts'), false);
});

test('GeoIP enabled missing/readable and disabled policies', () => {
  assert.equal(isGeoIpReady('true', 'missing.mmdb').status, STATUS.MISSING);
  assert.equal(isGeoIpReady('false', '').status, STATUS.NOT_REQUIRED);
  assert.equal(isGeoIpReady('true', __filename).status, STATUS.PRESENT);
});

test('disk threshold policy blocks low space', () => {
  assert.equal(diskSpaceIsSufficient(2048, 1024), true);
  assert.equal(diskSpaceIsSufficient(1023, 1024), false);
});

test('secret values never appear in validator output', () => {
  const secret = 'super-secret-fixture-value';
  const { result } = validate({ backend: { JWT_ACCESS_SECRET: secret } });
  assert.doesNotMatch(formatReport(result), /super-secret-fixture-value/);
});

test('healthy mocked preflight and dirty/allowlisted Git states', { skip: process.platform === 'win32' ? 'Bash is unavailable in the audit environment' : false }, () => {
  const directory = fixtureDirectory();
  fs.mkdirSync(path.join(directory, 'deploy', 'scripts'), { recursive: true });
  fs.mkdirSync(path.join(directory, 'deploy', 'config'), { recursive: true });
  fs.copyFileSync(path.join(__dirname, 'validate-production-preflight.sh'), path.join(directory, 'deploy', 'scripts', 'validate-production-preflight.sh'));
  fs.copyFileSync(path.join(__dirname, 'validate-environment-contract.js'), path.join(directory, 'deploy', 'scripts', 'validate-environment-contract.js'));
  fs.copyFileSync(path.join(__dirname, '..', 'config', 'environment-contract.yaml'), path.join(directory, 'deploy', 'config', 'environment-contract.yaml'));
  fs.copyFileSync(path.join(__dirname, 'backup-db.sh'), path.join(directory, 'deploy', 'scripts', 'backup-db.sh'));
  fs.writeFileSync(path.join(directory, 'docker-compose.prod.yml'), 'services: {}\n');
  const files = completeFixture(fixtureDirectory());
  childProcess.execFileSync('git', ['init', '-q', directory]);
  const run = () => childProcess.spawnSync('bash', [path.join(directory, 'deploy', 'scripts', 'validate-production-preflight.sh'), '--project-dir', directory, '--backend-env', files.backend, '--frontend-env', files.frontend, '--db-env', files.db, '--mock', '--min-free-mb', '1'], { encoding: 'utf8' });
  assert.equal(run().status, 0);
  fs.writeFileSync(path.join(directory, 'unexpected-source.ts'), 'unexpected');
  assert.notEqual(run().status, 0);
  fs.rmSync(path.join(directory, 'unexpected-source.ts'));
  fs.mkdirSync(path.join(directory, 'deploy', 'certs'));
  fs.writeFileSync(path.join(directory, 'deploy', 'certs', 'fixture.pem'), 'fixture');
  assert.equal(run().status, 0);
});
