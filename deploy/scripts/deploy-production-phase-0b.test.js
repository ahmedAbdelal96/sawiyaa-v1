'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

test('production migration sequence scans before the unified bootstrap', () => {
  const script = fs.readFileSync(path.join(__dirname, 'deploy-production.sh'), 'utf8');
  const scanner = script.indexOf('scanner_output="$(run_migration_safety_check');
  const backup = script.indexOf('Creating and verifying database backup before migrations...');
  const bootstrap = script.indexOf('db:bootstrap:production');
  assert.ok(scanner >= 0);
  assert.ok(backup > scanner);
  assert.ok(bootstrap > backup);
  assert.match(script, /bash "\$PROJECT_DIR\/deploy\/scripts\/backup-db\.sh"/);
});

test('migration command is guarded by backup and scanner failure checks', () => {
  const script = fs.readFileSync(path.join(__dirname, 'deploy-production.sh'), 'utf8');
  assert.match(script, /scanner_exit != 0/);
  assert.match(script, /Migration safety checks failed; migration was not run/);
  assert.match(script, /bash "\$PROJECT_DIR\/deploy\/scripts\/backup-db\.sh"/);
  assert.match(script, /SAWIYAA_TARGET_SHA=\"\$TARGET_SHA\"/);
});

test('applied Prisma migration discovery uses the canonical migration_name column', () => {
  const script = fs.readFileSync(path.join(__dirname, 'deploy-production.sh'), 'utf8');
  assert.match(
    script,
    /SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL ORDER BY migration_name/,
  );
  assert.doesNotMatch(
    script,
    /SELECT name FROM _prisma_migrations WHERE finished_at IS NOT NULL ORDER BY name/,
  );
});
