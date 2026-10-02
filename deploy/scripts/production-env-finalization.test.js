'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const repoRoot = path.resolve(__dirname, '..', '..');
const backendDir = path.join(repoRoot, 'sawiyaa-backend-v1');
const frontendDir = path.join(repoRoot, 'sawiyaa-frontend-v1');

function envKeys(filePath) {
  return fs.readFileSync(filePath, 'utf8').split(/\r?\n/).flatMap((line) => {
    const match = line.match(/^\s*(?:export\s+)?([A-Z][A-Z0-9_]*)\s*=/);
    return match ? [match[1]] : [];
  });
}

function assertPair(localPath, productionPath) {
  assert.equal(fs.existsSync(localPath), true, `missing local env file: ${localPath}`);
  assert.equal(fs.existsSync(productionPath), true, `missing production env file: ${productionPath}`);
  assert.deepEqual(envKeys(productionPath), envKeys(localPath));
  assert.equal(new Set(envKeys(productionPath)).size, envKeys(productionPath).length);
}

test('canonical local and production environment file pairs exist with identical key order', () => {
  assertPair(
    path.join(backendDir, '.env'),
    path.join(backendDir, '.env.production'),
  );
  assertPair(
    path.join(frontendDir, '.env'),
    path.join(frontendDir, '.env.production'),
  );
});

test('frontend production environment owns only frontend-safe variables', () => {
  const keys = new Set(envKeys(path.join(frontendDir, '.env.production')));
  for (const forbidden of [
    'DATABASE_URL',
    'POSTGRES_PASSWORD',
    'REDIS_URL',
    'JWT_ACCESS_SECRET',
    'JWT_REFRESH_SECRET',
    'STRIPE_SECRET_KEY',
    'PAYMOB_API_KEY',
    'PAYMOB_HMAC_SECRET',
    'DAILY_API_KEY',
    'DAILY_WEBHOOK_SECRET',
    'MAIL_PASS',
  ]) assert.equal(keys.has(forbidden), false, `frontend contains backend secret key ${forbidden}`);
});

test('production deployment tooling selects the canonical production env files', () => {
  const files = [
    path.join(repoRoot, 'deploy/scripts/deploy-production.sh'),
    path.join(repoRoot, 'deploy/scripts/validate-production-preflight.sh'),
    path.join(repoRoot, 'deploy/scripts/stage-release-env.sh'),
    path.join(repoRoot, 'docker-compose.prod.yml'),
  ];
  for (const file of files)
    assert.match(fs.readFileSync(file, 'utf8'), /\.env\.production/);
});

test('production env files remain ignored and are not tracked', () => {
  const ignored = [
    path.join(backendDir, '.env.production'),
    path.join(frontendDir, '.env.production'),
  ];
  for (const file of ignored) {
    const check = require('node:child_process').spawnSync(
      'git',
      ['check-ignore', '-q', '--', file],
      { cwd: repoRoot },
    );
    assert.equal(check.status, 0, `production env file is not ignored: ${file}`);
  }
});

test('legacy runtime env sources and production-specific templates are retired', () => {
  for (const file of [
    path.join(backendDir, '.env.postgres'),
    path.join(backendDir, '.env.production.backend.example'),
    path.join(frontendDir, '.env.local'),
    path.join(frontendDir, '.env.production.frontend.example'),
    path.join(repoRoot, 'backups/.env'),
    path.join(repoRoot, 'backups/.env.production.backend'),
    path.join(repoRoot, 'errors_production/.env'),
    path.join(repoRoot, 'sawiyaa-backend.env.upload'),
  ]) assert.equal(fs.existsSync(file), false, `legacy env source remains: ${file}`);
});
