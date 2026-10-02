const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '../..');
const prodUpdate = fs.readFileSync(path.join(__dirname, 'update-prod.sh'), 'utf8');
const devUpdate = fs.readFileSync(path.join(__dirname, 'update-dev.sh'), 'utf8');
const devCompose = fs.readFileSync(path.join(root, 'docker-compose.dev.yml'), 'utf8');

function serviceBlock(service) {
  const start = devCompose.indexOf(`  ${service}:`);
  assert.notEqual(start, -1, `service ${service} must exist`);
  const rest = devCompose.slice(start + 1);
  const next = rest.search(/^  [a-z0-9_-]+:/m);
  return next === -1 ? rest : rest.slice(0, next);
}

test('production wrapper delegates release ownership without pulling or checking out', () => {
  assert.match(prodUpdate, /bash "\$PROJECT_DIR\/deploy\/scripts\/deploy-production\.sh"/);
  assert.doesNotMatch(prodUpdate, /git\s+pull/);
  assert.doesNotMatch(prodUpdate, /git\s+(checkout|reset)/);
  assert.match(prodUpdate, /git status --porcelain/);
  assert.match(prodUpdate, /git branch --show-current/);
});

test('development keeps PostgreSQL, backend, and frontend off public host ports', () => {
  for (const service of ['postgres', 'backend', 'frontend']) {
    const block = serviceBlock(service);
    assert.doesNotMatch(block, /^    ports:/m, `${service} must not publish ports`);
    assert.match(block, /^    expose:/m, `${service} should expose only internally`);
  }
  const nginx = serviceBlock('nginx');
  assert.match(nginx, /- "\$\{SAWIYAA_DEV_HTTP_PORT:-8080\}:80"/);
});

test('development mounts the operator GeoIP database read-only', () => {
  assert.match(
    serviceBlock('backend'),
    /\.\/geoip\/GeoLite2-Country\.mmdb:\/opt\/sawiyaa\/geoip\/GeoLite2-Country\.mmdb:ro/,
  );
  assert.match(devUpdate, /GEOIP_ENABLED=true/);
  assert.match(devUpdate, /GEOIP_HOST_FILE/);
  assert.match(devUpdate, /missing or unreadable/);
});

test('development migration flow is ordered and forbids destructive reset/full seed', () => {
  const fetch = devUpdate.indexOf('git fetch --no-tags origin development');
  const pull = devUpdate.indexOf('git pull --ff-only origin development');
  const validate = devUpdate.indexOf('validate-environment-contract.js');
  const build = devUpdate.indexOf('docker compose "${COMPOSE_ARGS[@]}" build backend frontend');
  const postgres = devUpdate.indexOf('up -d postgres');
  const migrate = devUpdate.indexOf('npx prisma migrate deploy');
  const start = devUpdate.indexOf('up -d --force-recreate backend frontend nginx');
  assert.ok(fetch < pull && pull < validate && validate < build && build < postgres);
  assert.ok(postgres < migrate && migrate < start);
  assert.doesNotMatch(devUpdate, /migrate reset|down -v|db:seed/);
});
