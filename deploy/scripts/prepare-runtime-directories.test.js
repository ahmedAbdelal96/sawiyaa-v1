'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const helper = fs.readFileSync(
  path.join(__dirname, 'prepare-runtime-directories.sh'),
  'utf8',
);
const deploy = fs.readFileSync(
  path.join(__dirname, 'deploy-production.sh'),
  'utf8',
);
const preflight = fs.readFileSync(
  path.join(__dirname, 'validate-production-preflight.sh'),
  'utf8',
);

test('runtime preparation creates and owns only the backend log bind mount', () => {
  assert.match(helper, /mkdir -p -- "\$LOG_DIR"/);
  assert.match(helper, /--user 0:0/);
  assert.match(helper, /chown \$RUNTIME_UID:\$RUNTIME_GID \/target/);
  assert.match(helper, /chmod 0750 \/target/);
  assert.match(helper, /--mount "type=bind,src=\$LOG_DIR,dst=\/target"/);
  assert.doesNotMatch(helper, /chmod 0777|chmod 777/);
  assert.doesNotMatch(helper, /rm -rf/);
});

test('deployment prepares runtime directories before image build', () => {
  const prepare = deploy.indexOf('prepare-runtime-directories.sh');
  const build = deploy.indexOf('docker compose --env-file "$FRONTEND_ENV_FILE" -f "$COMPOSE_FILE" build');
  assert.ok(prepare >= 0);
  assert.ok(build > prepare);
});

test('preflight validates writability as the container UID/GID', () => {
  assert.match(preflight, /RUNTIME_LOG_DIRECTORY_WRITABLE/);
  assert.match(preflight, /RUNTIME_LOG_DIRECTORY_NOT_WRITABLE/);
  assert.match(preflight, /--user "\$RUNTIME_UID:\$RUNTIME_GID"/);
  assert.match(preflight, /\.sawiyaa-preflight-write-test/);
});
