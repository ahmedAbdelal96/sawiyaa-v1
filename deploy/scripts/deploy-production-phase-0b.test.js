'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

test('production migration sequence verifies backup and scanner before migrate deploy', () => {
  const script = fs.readFileSync(path.join(__dirname, 'deploy-production.sh'), 'utf8');
  const backup = script.indexOf('backup-db.sh');
  const scanner = script.indexOf('check-migration-safety.js');
  const migrate = script.indexOf('prisma:migrate:deploy');
  assert.ok(backup >= 0);
  assert.ok(scanner > backup);
  assert.ok(migrate > scanner);
});

test('migration command is guarded by backup and scanner failure checks', () => {
  const script = fs.readFileSync(path.join(__dirname, 'deploy-production.sh'), 'utf8');
  assert.match(script, /BACKUP_STATUS="VERIFIED"/);
  assert.match(script, /scanner_exit != 0/);
  assert.match(script, /Migration safety checks failed; migration was not run/);
});
