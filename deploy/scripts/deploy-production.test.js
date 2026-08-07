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
  assert.ok(position('git checkout -f main') < position('docker compose --env-file "$PROJECT_DIR/.env.production.frontend" -f "$COMPOSE_FILE" build'));
  assert.ok(position('docker compose --env-file "$PROJECT_DIR/.env.production.frontend" -f "$COMPOSE_FILE" build') < position('prisma:migrate:deploy'));
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
  assert.match(compose, /NEXT_PUBLIC_API_URL: \$\{NEXT_PUBLIC_API_URL\}/);
  assert.match(compose, /NEXT_PUBLIC_APP_URL: \$\{NEXT_PUBLIC_APP_URL\}/);
  assert.match(compose, /API_PROXY_TARGET: \$\{API_PROXY_TARGET\}/);
  assert.doesNotMatch(compose, /NEXT_PUBLIC_API_URL: \/api\/v1/);
  assert.doesNotMatch(compose, /NEXT_PUBLIC_APP_URL: https:\/\/sawiyaa\.com/);
});
