'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { scan, formatReport } = require('./check-migration-safety.js');

function fixture(sql, name = '20260801000000_fixture') {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sawiyaa-migration-safety-'));
  const migration = path.join(root, name);
  fs.mkdirSync(migration, { recursive: true });
  fs.writeFileSync(path.join(migration, 'migration.sql'), sql);
  return root;
}

function result(sql, options = {}) {
  return scan({ migrationsDir: fixture(sql), ...options });
}

test('classifies additive migration as SAFE', () => {
  assert.equal(result('CREATE TABLE example (id uuid PRIMARY KEY);').classification, 'SAFE');
});

test('classifies DROP TABLE as BLOCKING', () => {
  const report = result('DROP TABLE example;');
  assert.equal(report.classification, 'BLOCKED');
  assert.match(formatReport(report), /DROP_TABLE line=1/);
});

test('classifies DROP COLUMN as BLOCKING', () => {
  assert.equal(result('ALTER TABLE example DROP COLUMN old_value;').classification, 'BLOCKED');
});

test('classifies TRUNCATE, DROP TYPE, and rename as BLOCKING', () => {
  const report = result('TRUNCATE example;\nDROP TYPE old_type;\nALTER TABLE example RENAME TO new_example;');
  assert.equal(report.classification, 'BLOCKED');
  assert.match(formatReport(report), /TRUNCATE/);
  assert.match(formatReport(report), /DROP_TYPE/);
  assert.match(formatReport(report), /RENAME_TABLE/);
});

test('classifies DELETE without WHERE as BLOCKING', () => {
  assert.equal(result('DELETE FROM payments;').classification, 'BLOCKED');
});

test('classifies NOT NULL without backfill as BLOCKING', () => {
  assert.equal(result('ALTER TABLE example ALTER COLUMN name SET NOT NULL;').classification, 'BLOCKED');
});

test('classifies unique index as REVIEW_REQUIRED', () => {
  const report = result('CREATE UNIQUE INDEX example_unique ON example (code);');
  assert.equal(report.classification, 'REVIEW_REQUIRED');
});

test('classifies additive update and enum changes as REVIEW_REQUIRED', () => {
  const report = result('UPDATE example SET code = id;\nALTER TYPE status ADD VALUE \'READY\';');
  assert.equal(report.classification, 'REVIEW_REQUIRED');
});

test('explicit approval changes blocking classification to APPROVED', () => {
  assert.equal(result('DROP TABLE example;', { approve: true }).classification, 'APPROVED');
});

test('applied migrations are excluded from the scan', () => {
  const migrationsDir = fixture('DROP TABLE example;', '20260801000000_applied');
  const appliedFile = path.join(path.dirname(migrationsDir), 'applied.txt');
  fs.writeFileSync(appliedFile, '20260801000000_applied\n');
  const report = scan({ migrationsDir, appliedFile });
  assert.equal(report.classification, 'SAFE');
  assert.equal(report.results.length, 0);
});

test('reports no secret or environment values', () => {
  const report = formatReport(result('CREATE TABLE safe (note text); -- DATABASE_URL=secret-value'));
  assert.doesNotMatch(report, /secret-value|DATABASE_URL/);
});
