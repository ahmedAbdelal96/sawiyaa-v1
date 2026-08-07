'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

test('production migration sequence runs the scanner before migrate deploy', () => {
  const script = fs.readFileSync(path.join(__dirname, 'deploy-production.sh'), 'utf8');
  const scanner = script.indexOf('check-migration-safety.js');
  const migrate = script.indexOf('prisma:migrate:deploy');
  const backup = script.indexOf('backup-db.sh');
  assert.ok(backup >= 0);
  assert.ok(scanner >= 0);
  assert.ok(backup > scanner);
  assert.ok(migrate > scanner);
  assert.ok(migrate > backup);
});

test('migration command is guarded by backup and scanner failure checks', () => {
  const script = fs.readFileSync(path.join(__dirname, 'deploy-production.sh'), 'utf8');
  assert.match(script, /scanner_exit != 0/);
  assert.match(script, /Migration safety checks failed; migration was not run/);
  assert.match(script, /bash "\$PROJECT_DIR\/deploy\/scripts\/backup-db\.sh"/);
  assert.match(script, /SAWIYAA_TARGET_SHA=\"\$TARGET_SHA\"/);
});
