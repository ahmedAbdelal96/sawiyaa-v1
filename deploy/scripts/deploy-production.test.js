'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const script = fs.readFileSync(path.join(__dirname, 'deploy-production.sh'), 'utf8');

function position(text) {
  const value = script.indexOf(text);
  assert.notEqual(value, -1, `missing deployment step: ${text}`);
  return value;
}

test('target validation precedes active checkout, build, migration, and restart', () => {
  assert.ok(position('flock -n 9') < position('--bootstrap-only'));
  assert.ok(position('git fetch --no-tags origin') < position('git worktree add --detach'));
  assert.ok(position('--target-only --skip-lock') < position('git checkout -f main'));
  assert.ok(position('git checkout -f main') < position('docker compose --env-file "$FRONTEND_ENV_FILE" -f "$COMPOSE_FILE" build'));
  assert.ok(position('docker compose --env-file "$FRONTEND_ENV_FILE" -f "$COMPOSE_FILE" build') < position('prisma:migrate:deploy'));
  assert.ok(position('prisma:migrate:deploy') < position('up -d backend frontend nginx'));
});

test('target validation failure cleans the worktree and checks active HEAD stability', () => {
  assert.ok(position('cleanup_validation_worktree') < position('echo "Target validation passed'));
  assert.notEqual(script.indexOf('BLOCKING ACTIVE_RELEASE_CHANGED_ON_TARGET_FAILURE'), -1);
  assert.notEqual(script.indexOf('active release was not changed'), -1);
});

test('deployment uses status-only contract/preflight diagnostics', () => {
  assert.match(script, /--backend-env/);
  assert.doesNotMatch(script, /printenv/);
  assert.doesNotMatch(script, /\benv\s+\|/);
});

test('deployment defaults to canonical application env files', () => {
  assert.match(script, /sawiyaa-backend-v1\/\.env/);
  assert.match(script, /sawiyaa-backend-v1\/\.env\.postgres/);
  assert.match(script, /sawiyaa-frontend-v1\/\.env/);
  assert.doesNotMatch(script, /\.env\.production\.(backend|frontend|db)/);
});

test('production Compose identity is fixed across deployment phases', () => {
  const compose = fs.readFileSync(path.resolve(__dirname, '../../docker-compose.prod.yml'), 'utf8');
  const backup = fs.readFileSync(path.join(__dirname, 'backup-db.sh'), 'utf8');
  const preflight = fs.readFileSync(path.join(__dirname, 'validate-production-preflight.sh'), 'utf8');
  assert.match(compose, /^name: sawiyaa$/m);
  assert.match(script, /^export COMPOSE_PROJECT_NAME=sawiyaa$/m);
  assert.match(backup, /^export COMPOSE_PROJECT_NAME=sawiyaa$/m);
  assert.match(preflight, /^export COMPOSE_PROJECT_NAME=sawiyaa$/m);
  assert.match(script, /docker compose[\s\S]*ps/);
  assert.match(script, /docker compose[\s\S]*logs/);
  assert.ok((script.match(/docker compose/g) || []).length > 10);
});

test('deployment validates backend log access inside the container', () => {
  assert.doesNotMatch(script, /runuser/);
  assert.match(script, /run --rm --no-deps backend[\s\S]*touch \/app\/logs\/\.write-test/);
  assert.match(script, /Backend container user cannot write to \/app\/logs/);
});

test('detached target receives canonical env files before preflight', () => {
  const preflight = fs.readFileSync(
    path.join(__dirname, 'validate-production-preflight.sh'),
    'utf8',
  );
  assert.match(script, /stage-release-env\.sh/);
  assert.doesNotMatch(preflight, /cd -- "\$PROJECT_DIR"/);
});

test('deployment stages canonical env files into the detached target and avoids Compose env overrides', () => {
  assert.match(script, /stage-release-env\.sh/);
  const preflight = fs.readFileSync(
    path.join(__dirname, 'validate-production-preflight.sh'),
    'utf8',
  );
  assert.doesNotMatch(preflight, /compose-env-override/);
  assert.doesNotMatch(preflight, /COMPOSE_EXTRA_ARGS/);
  assert.match(preflight, /SANITIZED_COMPOSE_CONFIG_ERROR_BEGIN/);
});

test('deployment gates the build on database-backed provider state', () => {
  assert.ok(position('Starting PostgreSQL for database-backed environment checks...') < position('Building backend and frontend images...'));
  assert.match(script, /valueBoolean/);
  assert.match(script, /read_provider_state false/);
  assert.match(script, /read_provider_state true/);
  assert.match(script, /Database payment provider state is incomplete/);
  assert.match(script, /Database-backed environment validation failed after bootstrap/);
});

test('deployment uses the target validator and only the safe config bootstrap', () => {
  assert.match(
    script,
    /bash "\$VALIDATION_WORKTREE\/deploy\/scripts\/validate-production-preflight\.sh"/,
  );
  assert.match(script, /backup-before-deploy-/);
  assert.match(script, /ALLOW_CONFIG_BOOTSTRAP=true/);
  assert.match(script, /db:bootstrap:config/);
  assert.doesNotMatch(script, /db:bootstrap:payment-routes/);
});

test('deployment verifies checkout safety before destructive Git operations', () => {
  assert.ok(position('assert_active_checkout_safe') < position('git checkout -f main'));
  assert.match(script, /Unexpected tracked change before active checkout reset/);
  assert.match(script, /Unexpected untracked runtime path before active checkout reset/);
  assert.match(script, /\.sawiyaa-release/);
});

test('deployment writes a successful release marker after public health checks', () => {
  assert.ok(position('curl -fsS https://sawiyaa.com >/dev/null') < position('status=success'));
  assert.match(script, /targetSha=%s\\ndeployedAt=%s\\nstatus=success/);
});

test('Compose frontend build args come from interpolation, not duplicated production literals', () => {
  const compose = fs.readFileSync(path.resolve(__dirname, '../../docker-compose.prod.yml'), 'utf8');
  assert.match(compose, /env_file:\n\s+- \.\/sawiyaa-backend-v1\/\.env\.postgres/);
  assert.match(compose, /env_file:\n\s+- \.\/sawiyaa-backend-v1\/\.env/);
  assert.match(compose, /env_file:\n\s+- \.\/sawiyaa-frontend-v1\/\.env/);
  assert.doesNotMatch(compose, /\.env\.production\.(backend|frontend|db)/);
  assert.match(compose, /NEXT_PUBLIC_API_URL: \$\{NEXT_PUBLIC_API_URL\}/);
  assert.match(compose, /NEXT_PUBLIC_APP_URL: \$\{NEXT_PUBLIC_APP_URL\}/);
  assert.match(compose, /API_PROXY_TARGET: \$\{API_PROXY_TARGET\}/);
  assert.doesNotMatch(compose, /NEXT_PUBLIC_API_URL: \/api\/v1/);
  assert.doesNotMatch(compose, /NEXT_PUBLIC_APP_URL: https:\/\/sawiyaa\.com/);
});
