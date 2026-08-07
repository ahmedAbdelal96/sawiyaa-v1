"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const childProcess = require("node:child_process");
const test = require("node:test");

const bash =
  process.platform === "win32" ? "C:\\Program Files\\Git\\bin\\bash.exe" : "bash";
const bashAvailable =
  process.platform !== "win32" || fs.existsSync(bash);
const {
  STATUS,
  validateEnvironment,
  formatReport,
  classifyGitPaths,
  isAllowedOperationalPath,
  isGeoIpReady,
  diskSpaceIsSufficient,
  sourceEnvironmentNames,
  validateSourceExampleParity,
} = require("./validate-environment-contract.js");

function fixtureDirectory() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "sawiyaa-env-contract-"));
}

function writeEnv(directory, name, values) {
  const file = path.join(directory, name);
  fs.writeFileSync(
    file,
    Object.entries(values)
      .map(([key, value]) => `${key}=${value}`)
      .join("\n"),
    { mode: 0o600 },
  );
  return file;
}

function completeFixture(directory, overrides = {}) {
  const backend = writeEnv(directory, "backend.env", {
    APP_ENV: "production",
    NODE_ENV: "production",
    APP_URL: "https://sawiyaa.test",
    WEB_APP_URL: "https://sawiyaa.test",
    LOG_LEVEL: "info",
    DATABASE_URL: "postgresql://sawiyaa:valid-pass@localhost:5432/sawiyaa",
    JWT_ACCESS_SECRET: "a".repeat(32),
    JWT_REFRESH_SECRET: "b".repeat(32),
    GEOIP_ENABLED: "false",
    MAIL_PROVIDER: "smtp",
    MAIL_FROM: "noreply@sawiyaa.test",
    MAIL_HOST: "smtp.sawiyaa.test",
    MAIL_USER: "smtp-user",
    MAIL_PASS: "smtp-password",
    DAILY_API_KEY: "daily-api-key",
    DAILY_API_BASE_URL: "https://api.daily.co/v1",
    DAILY_WEBHOOK_SECRET: "daily-webhook-secret",
    CORPORATE_CODE_PEPPER: "c".repeat(32),
    ...overrides.backend,
  });
  const frontend = writeEnv(directory, "frontend.env", {
    NEXT_PUBLIC_API_URL: "/api/v1",
    NEXT_PUBLIC_APP_URL: "https://sawiyaa.test",
    API_PROXY_TARGET: "http://backend:7000",
    ...overrides.frontend,
  });
  const db = writeEnv(directory, "db.env", {
    POSTGRES_DB: "sawiyaa",
    POSTGRES_USER: "sawiyaa",
    POSTGRES_PASSWORD: "safe-local-fixture",
    ...overrides.db,
  });
  return {
    backend,
    frontend,
    db,
    backendEnv: backend,
    frontendEnv: frontend,
    dbEnv: db,
  };
}

function validate(overrides = {}) {
  const directory = fixtureDirectory();
  const files = completeFixture(directory, overrides);
  const result = validateEnvironment({
    ...files,
    environment: "production",
    providerStates: overrides.providerStates || new Map(),
  });
  return { directory, files, result };
}

test("required variable missing is blocking", () => {
  const directory = fixtureDirectory();
  const files = completeFixture(fixtureDirectory());
  const text = fs
    .readFileSync(files.backend, "utf8")
    .replace(/^DATABASE_URL=.*\n?/m, "");
  fs.writeFileSync(files.backend, text);
  assert.equal(
    validateEnvironment({ ...files, environment: "production" }).blocking,
    true,
  );
});

test("optional variable missing is not blocking", () => {
  const { result } = validate();
  assert.equal(result.blocking, false);
  assert.match(formatReport(result), /ENVIRONMENT_CONTRACT_SUMMARY blockers=0/);
});

test("conditional GeoIP requirement is enforced", () => {
  const { result } = validate({ backend: { GEOIP_ENABLED: "true" } });
  assert.match(formatReport(result), /BLOCKING_ENV GEOIP_DATABASE_PATH/);
  assert.equal(result.blocking, true);
});

test("production WEB_APP_URL is required before rollout", () => {
  const { result } = validate({ backend: { WEB_APP_URL: "" } });
  assert.match(formatReport(result), /BLOCKING_ENV WEB_APP_URL/);
  assert.equal(result.blocking, true);
});

test("production rejects invalid LOG_LEVEL before rollout", () => {
  const { result } = validate({ backend: { LOG_LEVEL: "http" } });
  assert.match(formatReport(result), /BLOCKING_ENV LOG_LEVEL/);
  assert.equal(result.blocking, true);
});

test("production requires Daily webhook signing secret", () => {
  const { result } = validate({ backend: { DAILY_WEBHOOK_SECRET: "" } });
  assert.match(formatReport(result), /BLOCKING_ENV DAILY_WEBHOOK_SECRET/);
  assert.equal(result.blocking, true);
});

test("Stripe disabled allows placeholder frontend and empty backend credentials", () => {
  const { result } = validate({
    backend: {
      PAYMENT_STRIPE_ENABLED: "false",
      STRIPE_PUBLISHABLE_KEY: "",
      STRIPE_SECRET_KEY: "",
      STRIPE_WEBHOOK_SECRET: "",
    },
    frontend: { NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_test_your_stripe_publishable_key" },
    providerStates: new Map([["stripe", false]]),
  });
  assert.equal(result.blocking, false);
});

test("Stripe enabled rejects placeholder frontend key and missing secret", () => {
  const { result } = validate({
    backend: { PAYMENT_STRIPE_ENABLED: "true", STRIPE_PUBLISHABLE_KEY: "pk_test_sanitized" },
    frontend: { NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_test_your_stripe_publishable_key" },
    providerStates: new Map([["stripe", true]]),
  });
  const report = formatReport(result);
  assert.match(report, /BLOCKING_ENV NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY/);
  assert.match(report, /BLOCKING_ENV STRIPE_SECRET_KEY/);
  assert.equal(result.blocking, true);
});

test("Stripe enabled accepts valid sanitized test credentials", () => {
  const { result } = validate({
    backend: {
      PAYMENT_STRIPE_ENABLED: "true",
      STRIPE_MODE: "test",
      STRIPE_PUBLISHABLE_KEY: "pk_test_sanitized",
      STRIPE_SECRET_KEY: "sk_test_sanitized",
      STRIPE_WEBHOOK_SECRET: "whsec_sanitized",
    },
    frontend: { NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_test_sanitized" },
    providerStates: new Map([["stripe", true]]),
  });
  assert.equal(result.blocking, false);
  assert.match(formatReport(result), /ENVIRONMENT_CONTRACT_SUMMARY blockers=0/);
});

test("Paymob disabled allows empty optional credentials", () => {
  const { result } = validate({
    backend: {
      PAYMENT_PAYMOB_ENABLED: "false",
      PAYMOB_API_KEY: "",
      PAYMOB_HMAC_SECRET: "",
      PAYMOB_EGP_CARD_INTEGRATION_ID: "",
    },
    providerStates: new Map([["paymob", false]]),
  });
  assert.equal(result.blocking, false);
});

test("Paymob enabled requires only the active checkout credentials", () => {
  const { result } = validate({
    backend: {
      PAYMENT_PAYMOB_ENABLED: "true",
      PAYMOB_API_KEY: "paymob-api",
      PAYMOB_HMAC_SECRET: "",
      PAYMOB_BASE_URL: "https://accept.paymob.com/api",
    },
    providerStates: new Map([["paymob", true]]),
  });
  assert.match(formatReport(result), /BLOCKING_ENV PAYMOB_HMAC_SECRET/);
  assert.doesNotMatch(formatReport(result), /BLOCKING_ENV PAYMOB_USD_CARD_INTEGRATION_ID/);
  assert.equal(result.blocking, true);
});

test("Redis URL is required only when Redis throttling is selected", () => {
  assert.equal(
    validate({ backend: { THROTTLE_STORE: "memory", REDIS_URL: "" } }).result.blocking,
    false,
  );
  const { result } = validate({ backend: { THROTTLE_STORE: "redis", REDIS_URL: "" } });
  assert.match(formatReport(result), /BLOCKING_ENV REDIS_URL/);
  assert.equal(result.blocking, true);
});

test("mail validation requires only the selected provider credentials", () => {
  const brevo = validate({
    backend: {
      MAIL_PROVIDER: "brevo",
      BREVO_API_KEY: "brevo-sanitized",
      MAIL_FROM: "noreply@sawiyaa.test",
      MAIL_HOST: "",
      MAIL_USER: "",
      MAIL_PASS: "",
    },
  }).result;
  assert.equal(brevo.blocking, false);
  const smtp = validate({
    backend: { MAIL_PROVIDER: "smtp", MAIL_HOST: "", MAIL_USER: "", MAIL_PASS: "" },
  }).result;
  assert.match(formatReport(smtp), /BLOCKING_ENV MAIL_HOST/);
  assert.equal(smtp.blocking, true);
});

test("blocking diagnostics never print secret values", () => {
  const secret = "super-secret-sanitized-value";
  const { result } = validate({ backend: { JWT_ACCESS_SECRET: secret, STRIPE_SECRET_KEY: "" } });
  const report = formatReport(result);
  assert.doesNotMatch(report, /super-secret-sanitized-value/);
  assert.match(report, /ENVIRONMENT_CONTRACT_SUMMARY blockers=/);
});

test("empty required secret is blocking and redacted", () => {
  const { result } = validate({ backend: { JWT_ACCESS_SECRET: "" } });
  const report = formatReport(result);
  assert.match(report, /BLOCKING_ENV JWT_ACCESS_SECRET/);
  assert.doesNotMatch(report, /a{10,}|valid-pass/);
});

test("placeholder values are detected without printing values", () => {
  const { result } = validate({
    backend: { JWT_ACCESS_SECRET: "<change-me>" },
  });
  const report = formatReport(result);
  assert.match(report, /BLOCKING_ENV JWT_ACCESS_SECRET/);
  assert.doesNotMatch(report, /change-me/);
});

test("unknown and duplicate variables are detected", () => {
  const directory = fixtureDirectory();
  const files = completeFixture(directory);
  fs.appendFileSync(
    files.backend,
    "\nUNKNOWN_PRODUCTION_FLAG=true\nAPP_ENV=production\n",
  );
  const report = formatReport(
    validateEnvironment({ ...files, environment: "production" }),
  );
  assert.match(report, /WARNING_ENV UNKNOWN_PRODUCTION_FLAG/);
  assert.match(report, /BLOCKING_ENV APP_ENV/);
});

test("canonical and legacy Paymob conflict is blocking", () => {
  const { result } = validate({
    backend: {
      PAYMOB_MODE: "test",
      PAYMOB_API_KEY: "api",
      PAYMOB_HMAC_SECRET: "hmac",
      PAYMOB_BASE_URL: "https://accept.paymob.com/api",
      PAYMOB_EGP_CARD_INTEGRATION_ID: "canonical",
      PAYMOB_INTEGRATION_ID_CARD: "legacy",
    },
  });
  assert.match(formatReport(result), /BLOCKING_ENV PAYMOB_EGP_CARD_INTEGRATION_ID/);
});

test("optional USD integration may remain empty", () => {
  const { result } = validate({
    backend: { PAYMOB_USD_CARD_INTEGRATION_ID: "" },
  });
  assert.doesNotMatch(
    formatReport(result),
    /MISSING PAYMOB_USD_CARD_INTEGRATION_ID/,
  );
});

test("database-authoritative route JSON is forbidden", () => {
  const { result } = validate({
    backend: { PAYMENT_PROVIDER_ROUTES_JSON: "{}" },
  });
  assert.match(formatReport(result), /BLOCKING_ENV PAYMENT_PROVIDER_ROUTES_JSON/);
});

test("frontend variables are classified as build-time and missing is blocking", () => {
  const { result } = validate({ frontend: { NEXT_PUBLIC_API_URL: "" } });
  assert.match(formatReport(result), /BLOCKING_ENV NEXT_PUBLIC_API_URL/);
  assert.equal(result.blocking, true);
});

test("source-referenced variables missing from the example are blocking", () => {
  const directory = fixtureDirectory();
  const source = path.join(directory, "source.ts");
  const example = path.join(directory, ".env.example");
  fs.writeFileSync(source, "const value = process.env.NEW_FEATURE_SETTING;\n");
  fs.writeFileSync(example, "EXISTING_SETTING=value\n");
  const issues = [];
  validateSourceExampleParity({
    service: "backend",
    examplePath: example,
    sourceFiles: [source],
    issues,
  });
  assert.deepEqual([...sourceEnvironmentNames([source])], ["NEW_FEATURE_SETTING"]);
  assert.deepEqual(issues, [{
    status: STATUS.UNKNOWN,
    name: "backend/source/NEW_FEATURE_SETTING",
    blocking: true,
  }]);
});

test("new target-release required frontend variable is blocking", () => {
  const { files } = validate();
  const targetContract = {
    entries: [
      {
        name: "NEXT_PUBLIC_NEW_REQUIRED_FLAG",
        service: "frontend",
        required: true,
      },
    ],
  };
  const result = validateEnvironment({
    ...files,
    contract: targetContract,
    knownNames: new Set(["NEXT_PUBLIC_NEW_REQUIRED_FLAG"]),
    environment: "production",
  });
  assert.match(formatReport(result), /BLOCKING_ENV NEXT_PUBLIC_NEW_REQUIRED_FLAG/);
  assert.equal(result.blocking, true);
});

test("removed target-release variable is blocking when no deprecation policy exists", () => {
  const { files } = validate({ backend: { REMOVED_BY_TARGET: "stale" } });
  const result = validateEnvironment({
    ...files,
    environment: "production",
    knownNames: new Set(),
  });
  assert.match(formatReport(result), /WARNING_ENV REMOVED_BY_TARGET/);
  assert.equal(result.blocking, false);
});

test("removed variable retained in the contract is blocking unless explicitly deprecated", () => {
  const { files } = validate({ backend: { REMOVED_BY_TARGET: "stale" } });
  const result = validateEnvironment({
    ...files,
    environment: "production",
    knownNames: new Set(),
    contract: {
      entries: [
        { name: "REMOVED_BY_TARGET", service: "backend", required: false },
      ],
    },
  });
  assert.match(formatReport(result), /WARNING_ENV REMOVED_BY_TARGET/);
  assert.equal(result.blocking, false);
});

test("configured renamed alias is reported as deprecated without printing its value", () => {
  const { files } = validate({
    backend: { PAYMOB_INTEGRATION_ID_CARD: "legacy-secret" },
  });
  const result = validateEnvironment({ ...files, environment: "production" });
  const report = formatReport(result);
  assert.match(report, /WARNING_ENV PAYMOB_INTEGRATION_ID_CARD/);
  assert.doesNotMatch(report, /legacy-secret/);
});

test("Git tracked dirty and untracked policies are deterministic", () => {
  const result = classifyGitPaths(
    [
      " M src/app.ts",
      "?? deploy/certs/cert.pem",
      "?? deploy-build.pid",
      "?? src/new.ts",
    ],
    ["deploy/certs/", "deploy/certbot-logs/", "deploy-build.pid", "*.before-*"],
  );
  assert.equal(result[0].status, "BLOCKING_TRACKED_DIRTY");
  assert.equal(result[1].status, "ALLOWED_UNTRACKED");
  assert.equal(result[2].status, "ALLOWED_UNTRACKED");
  assert.equal(result[3].status, "BLOCKING_UNEXPECTED_UNTRACKED");
  assert.equal(isAllowedOperationalPath("src/new.ts"), false);
});

test("GeoIP enabled missing/readable and disabled policies", () => {
  assert.equal(isGeoIpReady("true", "missing.mmdb").status, STATUS.MISSING);
  assert.equal(isGeoIpReady("false", "").status, STATUS.NOT_REQUIRED);
  assert.equal(isGeoIpReady("true", __filename).status, STATUS.PRESENT);
});

test("disk threshold policy blocks low space", () => {
  assert.equal(diskSpaceIsSufficient(2048, 1024), true);
  assert.equal(diskSpaceIsSufficient(1023, 1024), false);
});

test("secret values never appear in validator output", () => {
  const secret = "super-secret-fixture-value";
  const { result } = validate({ backend: { JWT_ACCESS_SECRET: secret } });
  assert.doesNotMatch(formatReport(result), /super-secret-fixture-value/);
});

test(
  "healthy mocked preflight and dirty/allowlisted Git states",
  {
    skip: !bashAvailable,
  },
  () => {
    const directory = fixtureDirectory();
    fs.mkdirSync(path.join(directory, "deploy", "scripts"), {
      recursive: true,
    });
    fs.mkdirSync(path.join(directory, "deploy", "config"), { recursive: true });
    fs.cpSync(
      path.join(__dirname, "..", "..", "sawiyaa-backend-v1", "src", "config"),
      path.join(directory, "sawiyaa-backend-v1", "src", "config"),
      { recursive: true },
    );
    fs.cpSync(
      path.join(__dirname, "..", "..", "sawiyaa-frontend-v1", "src"),
      path.join(directory, "sawiyaa-frontend-v1", "src"),
      { recursive: true },
    );
    fs.copyFileSync(
      path.join(__dirname, "..", "..", "sawiyaa-frontend-v1", "next.config.ts"),
      path.join(directory, "sawiyaa-frontend-v1", "next.config.ts"),
    );
    fs.copyFileSync(
      path.join(__dirname, "validate-production-preflight.sh"),
      path.join(
        directory,
        "deploy",
        "scripts",
        "validate-production-preflight.sh",
      ),
    );
    fs.copyFileSync(
      path.join(__dirname, "validate-environment-contract.js"),
      path.join(
        directory,
        "deploy",
        "scripts",
        "validate-environment-contract.js",
      ),
    );
    fs.copyFileSync(
      path.join(__dirname, "..", "config", "environment-contract.yaml"),
      path.join(directory, "deploy", "config", "environment-contract.yaml"),
    );
    fs.copyFileSync(
      path.join(__dirname, "backup-db.sh"),
      path.join(directory, "deploy", "scripts", "backup-db.sh"),
    );
    fs.writeFileSync(
      path.join(directory, "docker-compose.prod.yml"),
      "services: {}\n",
    );
    childProcess.execFileSync("git", ["init", "-q", directory]);
    childProcess.execFileSync("git", ["-C", directory, "add", "."]);
    childProcess.execFileSync("git", [
      "-C",
      directory,
      "-c",
      "user.email=fixture@example.test",
      "-c",
      "user.name=fixture",
      "commit",
      "-qm",
      "fixture",
    ]);
    const files = completeFixture(fixtureDirectory());
    const run = (extraArgs = [], extraEnv = {}, inputFiles = files) =>
      childProcess.spawnSync(
        bash,
        [
          path.join(
            directory,
            "deploy",
            "scripts",
            "validate-production-preflight.sh",
          ),
          "--project-dir",
          directory,
          "--backend-env",
          inputFiles.backend,
          "--frontend-env",
          inputFiles.frontend,
          "--db-env",
          inputFiles.db,
          "--mock",
          "--skip-lock",
          "--min-free-mb",
          "1",
          ...extraArgs,
        ],
        {
          encoding: "utf8",
          env: { ...process.env, ...extraEnv },
        },
      );
    const healthyRun = run();
    assert.equal(healthyRun.status, 0, `${healthyRun.stdout}\n${healthyRun.stderr}`);
    const bootstrapRun = run(["--bootstrap-only"]);
    assert.equal(bootstrapRun.status, 0, `${bootstrapRun.stdout}\n${bootstrapRun.stderr}`);

    const bin = path.join(directory, "bin");
    fs.mkdirSync(bin);
    const nodeExecutable = process.execPath.replaceAll("\\", "/");
    fs.writeFileSync(
      path.join(bin, "docker"),
      `#!/usr/bin/env bash
node_executable="${nodeExecutable}"
workspace=""
backend_env=""
frontend_env=""
db_env=""
while [[ $# -gt 0 ]]; do
  if [[ "$1" == "-v" ]]; then
    mount="$2"
    case "$mount" in
      *:/workspace:ro) workspace="\${mount%:/workspace:ro}" ;;
      *:/inputs/backend.env:ro) backend_env="\${mount%:/inputs/backend.env:ro}" ;;
      *:/inputs/frontend.env:ro) frontend_env="\${mount%:/inputs/frontend.env:ro}" ;;
      *:/inputs/db.env:ro) db_env="\${mount%:/inputs/db.env:ro}" ;;
    esac
    shift 2
  else
    shift
  fi
done
"$node_executable" "$workspace/deploy/scripts/validate-environment-contract.js" \
  --backend-env "$backend_env" --frontend-env "$frontend_env" --db-env "$db_env" --environment production
`,
    );
    fs.chmodSync(path.join(bin, "docker"), 0o755);
    childProcess.execFileSync("git", ["-C", directory, "add", "bin/docker"]);
    childProcess.execFileSync("git", [
      "-C",
      directory,
      "-c",
      "user.email=fixture@example.test",
      "-c",
      "user.name=fixture",
      "commit",
      "-qm",
      "docker-fixture",
    ]);
    const shellPath =
      process.platform === "win32"
        ? process.env.PATH.replaceAll(";", ":")
        : process.env.PATH;
    const dockerFallbackRun = run([], {
      PATH: `${bin}:${shellPath}`,
      SAWIYAA_FORCE_DOCKER_VALIDATOR: "true",
    });
    assert.equal(
      dockerFallbackRun.status,
      0,
      `${dockerFallbackRun.stdout}\n${dockerFallbackRun.stderr}`,
    );
    assert.match(dockerFallbackRun.stdout, /PASS ENVIRONMENT_CONTRACT/);
    fs.writeFileSync(
      path.join(directory, "unexpected-source.ts"),
      "unexpected",
    );
    assert.notEqual(run().status, 0);
    fs.rmSync(path.join(directory, "unexpected-source.ts"));
    fs.mkdirSync(path.join(directory, "deploy", "certs"));
    fs.writeFileSync(
      path.join(directory, "deploy", "certs", "fixture.pem"),
      "fixture",
    );
    assert.equal(run().status, 0);
  },
);
