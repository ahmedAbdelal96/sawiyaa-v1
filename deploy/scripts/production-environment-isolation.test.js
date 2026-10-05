"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "../..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("main production paths use canonical .env.production files", () => {
  const compose = read("docker-compose.prod.yml");
  const deploy = read("deploy/scripts/deploy-production.sh");
  const preflight = read("deploy/scripts/validate-production-preflight.sh");
  assert.match(compose, /sawiyaa-backend-v1\/\.env\.production/);
  assert.match(compose, /sawiyaa-frontend-v1\/\.env\.production/);
  assert.match(deploy, /sawiyaa-backend-v1\/\.env\.production/);
  assert.match(deploy, /sawiyaa-frontend-v1\/\.env\.production/);
  assert.match(preflight, /sawiyaa-backend-v1\/\.env\.production/);
  assert.match(preflight, /sawiyaa-frontend-v1\/\.env\.production/);
  for (const source of [compose, deploy, preflight]) {
    assert.doesNotMatch(source, /\.env\.production\.(backend|frontend)/);
    assert.doesNotMatch(source, /sawiyaa-(?:backend|frontend)-v1[\\/]\.env(?:["'`]|$|[\\/])/);
  }
});

test("local backend loading does not require generic .env", () => {
  assert.match(read("sawiyaa-backend-v1/src/app.module.ts"), /\.env\.local/);
  assert.match(read("sawiyaa-backend-v1/prisma.config.js"), /\.env\.local/);
  assert.match(read("sawiyaa-backend-v1/scripts/run-with-env.js"), /\.env\.local/);
  assert.doesNotMatch(read("sawiyaa-backend-v1/src/app.module.ts"), /envFilePath:\s*['"]\.env['"]/);
  assert.doesNotMatch(read("sawiyaa-backend-v1/prisma.config.js"), /dotenv\/config/);
});

test("production Compose passes NEXT_PUBLIC values as build arguments", () => {
  const compose = read("docker-compose.prod.yml");
  assert.match(compose, /NEXT_PUBLIC_API_URL: \$\{NEXT_PUBLIC_API_URL\}/);
  assert.match(compose, /NEXT_PUBLIC_APP_URL: \$\{NEXT_PUBLIC_APP_URL\}/);
  assert.match(compose, /API_PROXY_TARGET: \$\{API_PROXY_TARGET\}/);
});
