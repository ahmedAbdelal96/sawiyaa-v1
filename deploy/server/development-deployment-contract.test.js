"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "../..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");

test("development deployment uses canonical development env files", () => {
  const script = read("deploy/server/update-dev.sh");
  const compose = read("docker-compose.dev.yml");

  assert.match(script, /sawiyaa-backend-v1\/\.env\.development/);
  assert.match(script, /sawiyaa-frontend-v1\/\.env\.development/);
  assert.doesNotMatch(script, /sawiyaa-backend-v1\/\.env(?:['"`]|\s)/);
  assert.doesNotMatch(script, /sawiyaa-frontend-v1\/\.env(?:['"`]|\s)/);
  assert.match(compose, /sawiyaa-backend-v1\/\.env\.development/);
  assert.match(compose, /sawiyaa-frontend-v1\/\.env\.development/);
  assert.doesNotMatch(compose, /sawiyaa-(?:backend|frontend)-v1\/\.env(?:['"`]|\s)/);
});

test("development ingress is localhost-only on port 8080", () => {
  const compose = read("docker-compose.dev.yml");
  assert.match(compose, /127\.0\.0\.1:\$\{SAWIYAA_DEV_HTTP_PORT:-8080\}:80/);
  assert.doesNotMatch(compose, /(?<!127\.0\.0\.1):\$\{SAWIYAA_DEV_HTTP_PORT:-8080\}:80/);
  assert.doesNotMatch(compose, /0\.0\.0\.0.*8080/);
});

test("development updater runs curated idempotent seed", () => {
  const script = read("deploy/server/update-dev.sh");
  assert.match(script, /SEED_PROFILE=curated/);
  assert.match(script, /SEED_SKIP_IF_BOOTSTRAPPED=true/);
  assert.match(script, /npm run prisma:seed/);
});

test("development updater reconciles the legacy project-scoped network without volumes", () => {
  const script = read("deploy/server/update-dev.sh");
  assert.match(script, /legacy_network=.*COMPOSE_PROJECT.*sawiyaa_dev_internal/);
  assert.match(script, /docker compose .*down --remove-orphans/);
  assert.match(script, /docker network disconnect -f/);
  assert.match(script, /docker network rm/);
  assert.doesNotMatch(script, /docker compose .*down\s+[^\n]*-v/);
  assert.doesNotMatch(script, /docker volume rm/);
});
