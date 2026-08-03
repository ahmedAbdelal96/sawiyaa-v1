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
  assert.ok(position('git checkout -f main') < position('docker compose -f "$COMPOSE_FILE" build'));
  assert.ok(position('docker compose -f "$COMPOSE_FILE" build') < position('prisma:migrate:deploy'));
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
