"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "../..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");

test("local backend commands select .env.local explicitly", () => {
  assert.match(read("sawiyaa-backend-v1/src/app.module.ts"), /\.env\.local/);
  assert.match(read("sawiyaa-backend-v1/prisma.config.js"), /\.env\.local/);
  assert.match(read("sawiyaa-backend-v1/scripts/run-with-env.js"), /\.env\.local/);
  assert.match(read("sawiyaa-backend-v1/scripts/kill-port-6000.js"), /\.env\.local/);
  assert.match(read("sawiyaa-backend-v1/package.json"), /run-with-env\.js/);
});

test("development deployment selects only .env.development", () => {
  for (const file of [
    "docker-compose.dev.yml",
    "deploy/server/update-dev.sh",
    ".github/workflows/development-deployment-acceptance.yml",
    "deploy/server/development-acceptance.test.js",
  ]) {
    const fullSource = read(file);
    const source = file.startsWith(".github/")
      ? fullSource.split("  production-regression:")[0]
      : fullSource;
    assert.match(source, /\.env\.development/, file);
    assert.doesNotMatch(source, /sawiyaa-(?:backend|frontend)-v1\/\.env(?:['"`]|$|[\\/])/, file);
    assert.doesNotMatch(source, /\.env\.production/, file);
  }
});

test("production deployment selects only canonical app production files", () => {
  for (const file of [
    "docker-compose.prod.yml",
    "deploy/server/update-prod.sh",
    "deploy/scripts/deploy-production.sh",
    "deploy/scripts/validate-production-preflight.sh",
    "deploy/scripts/local-validate.ps1",
  ]) {
    const source = read(file);
    assert.match(source, /\.env\.production/, file);
    assert.doesNotMatch(source, /\.env\.production\.(?:backend|frontend)/, file);
    assert.doesNotMatch(source, /sawiyaa-(?:backend|frontend)-v1[\\/]\.env(?:['"`]|$|[\\/])/, file);
  }
});

test("real environment filenames are ignored by repository and app gitignore files", () => {
  const rootIgnore = read(".gitignore");
  assert.match(rootIgnore, /^\.env$/m);
  assert.match(rootIgnore, /^\.env\.\*$/m);
  for (const file of ["sawiyaa-backend-v1/.gitignore", "sawiyaa-frontend-v1/.gitignore"]) {
    const source = read(file);
    for (const name of [".env", ".env.local", ".env.development", ".env.production"])
      assert.match(source, new RegExp(name.replace(".", "\\.")), file);
  }
});

test("validator reports selected filenames without environment values", () => {
  const validator = require(path.join(root, "deploy/scripts/validate-environment-contract.js"));
  const result = validator.validateEnvironment({
    backendEnv: path.join(root, "deploy/env/development.backend.example"),
    frontendEnv: path.join(root, "deploy/env/development.frontend.example"),
    environment: "development",
  });
  const report = validator.formatReport(result);
  assert.match(report, /^ENVIRONMENT=development/m);
  assert.match(report, /BACKEND_ENV_FILE=deploy\/env\/development\.backend\.example/);
  assert.match(report, /FRONTEND_ENV_FILE=deploy\/env\/development\.frontend\.example/);
  assert.doesNotMatch(report, /JWT_ACCESS_SECRET=/);
  assert.doesNotMatch(report, /DATABASE_URL=/);
});
