'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const childProcess = require('node:child_process');
const test = require('node:test');

const bash = process.platform === 'win32' ? 'C:\\Program Files\\Git\\bin\\bash.exe' : 'bash';
const bashAvailable = process.platform !== 'win32' || fs.existsSync(bash);

function runBackup({ restoreFails = false, minBytes = '1', minFreeMb = '0', retentionCount = '20', seedOldBackups = false, postgresMissing = false, emptyDump = false, directoryFile = false } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sawiyaa-backup-'));
  const bin = path.join(root, 'bin');
  const backupDir = path.join(root, 'backups');
  fs.mkdirSync(bin);
  if (directoryFile) fs.writeFileSync(backupDir, 'not a directory');
  else fs.mkdirSync(backupDir);
  if (seedOldBackups) {
    for (const [index, age] of [30, 20, 10].entries()) {
      const file = path.join(backupDir, `sawiyaa-20260101-00000${index}-abcdef12.dump`);
      fs.writeFileSync(file, 'old backup');
      fs.utimesSync(file, new Date(Date.now() - age * 60_000), new Date(Date.now() - age * 60_000));
    }
    fs.writeFileSync(path.join(backupDir, 'unrelated.txt'), 'keep me');
  }
  fs.writeFileSync(path.join(root, 'docker-compose.prod.yml'), 'services: {}\n');
  fs.writeFileSync(path.join(bin, 'docker'), `#!/usr/bin/env bash\nif [[ "$*" == *"ps --status running --services"* ]]; then ${postgresMissing ? ':' : 'echo postgres'}; elif [[ "$*" == *"pg_dump"* ]]; then ${emptyDump ? ':' : "printf 'fixture dump'"}; elif [[ "$*" == *"pg_restore --list"* ]]; then ${restoreFails ? 'exit 1' : 'exit 0'}; elif [[ "$*" == *"psql"* ]]; then echo 'PostgreSQL 16 fixture'; fi\n`);
  fs.chmodSync(path.join(bin, 'docker'), 0o755);
  const shellPath = process.platform === 'win32' ? process.env.PATH.replaceAll(';', ':') : process.env.PATH;
  const env = { ...process.env, PATH: `${bin}:${shellPath}`, SAWIYAA_PROJECT_DIR: root, SAWIYAA_BACKUP_DIR: backupDir, SAWIYAA_BACKUP_MIN_FREE_MB: minFreeMb, SAWIYAA_BACKUP_MIN_BYTES: minBytes, SAWIYAA_BACKUP_RETENTION_COUNT: retentionCount, SAWIYAA_TARGET_SHA: '0123456789abcdef0123456789abcdef01234567' };
  const script = path.join(__dirname, 'backup-db.sh');
  const run = childProcess.spawnSync(bash, [script], { cwd: root, env, encoding: 'utf8' });
  return { root, backupDir, run };
}

test('backup script creates verified dump, checksum, and metadata', { skip: !bashAvailable }, () => {
  const { backupDir, run } = runBackup();
  assert.equal(run.status, 0, run.stderr);
  assert.equal(fs.readdirSync(backupDir).filter((file) => file.endsWith('.dump')).length, 1);
  assert.equal(fs.readdirSync(backupDir).filter((file) => file.endsWith('.sha256')).length, 1);
  const metadata = fs.readFileSync(path.join(backupDir, fs.readdirSync(backupDir).find((file) => file.endsWith('.metadata.json'))), 'utf8');
  assert.match(metadata, /"verificationStatus": "VERIFIED"/);
});

test('backup script stops when container pg_restore verification fails', { skip: !bashAvailable }, () => {
  const { backupDir, run } = runBackup({ restoreFails: true });
  assert.notEqual(run.status, 0);
  assert.equal(fs.readdirSync(backupDir).length, 0);
});

test('backup script rejects an undersized dump', { skip: !bashAvailable }, () => {
  const { backupDir, run } = runBackup({ minBytes: '1000' });
  assert.notEqual(run.status, 0);
  assert.equal(fs.readdirSync(backupDir).length, 0);
});

test('backup script fails when the database service is unavailable', { skip: !bashAvailable }, () => {
  const { run } = runBackup({ postgresMissing: true });
  assert.notEqual(run.status, 0);
  assert.match(run.stderr, /Database service is not running/);
});

test('checksum mismatch is rejected by the verification command', { skip: !bashAvailable }, () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'sawiyaa-checksum-'));
  const dump = path.join(directory, 'backup.dump');
  const checksum = path.join(directory, 'backup.dump.sha256');
  fs.writeFileSync(dump, 'fixture');
  fs.writeFileSync(checksum, `${'0'.repeat(64)}  ${dump}\n`);
  const run = childProcess.spawnSync(bash, ['-lc', `sha256sum --check "${checksum}"`], { encoding: 'utf8' });
  assert.notEqual(run.status, 0);
});

test('backup script fails below the configured disk threshold', { skip: !bashAvailable }, () => {
  const { run } = runBackup({ minFreeMb: '999999999' });
  assert.notEqual(run.status, 0);
  assert.match(run.stderr, /below threshold/);
});

test('backup script fails when the backup destination is not a directory', { skip: !bashAvailable }, () => {
  const { run } = runBackup({ directoryFile: true });
  assert.notEqual(run.status, 0);
  assert.match(run.stderr, /Backup directory is unavailable|not writable/);
});

test('retention keeps the newest configured count and unrelated files', { skip: !bashAvailable }, () => {
  const { backupDir, run } = runBackup({ retentionCount: '1', seedOldBackups: true });
  assert.equal(run.status, 0, run.stderr);
  assert.equal(fs.readdirSync(backupDir).filter((file) => file.endsWith('.dump')).length, 1);
  assert.equal(fs.existsSync(path.join(backupDir, 'unrelated.txt')), true);
});
