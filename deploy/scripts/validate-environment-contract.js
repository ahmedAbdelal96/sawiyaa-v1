#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");

const STATUS = Object.freeze({
  PRESENT: "PRESENT",
  MISSING: "MISSING",
  EMPTY: "EMPTY",
  PLACEHOLDER: "PLACEHOLDER",
  INVALID: "INVALID",
  UNKNOWN: "UNKNOWN",
  CONFLICT: "CONFLICT",
  DEPRECATED: "DEPRECATED",
  NOT_REQUIRED: "NOT_REQUIRED",
});

const REPO_ROOT = path.resolve(__dirname, "../..");
const CONTRACT_PATH = path.join(
  REPO_ROOT,
  "deploy/config/environment-contract.yaml",
);
const SECRET_NAME_PATTERN =
  /(SECRET|PASSWORD|TOKEN|API_KEY|PRIVATE|HMAC|DATABASE_URL|INTEGRATION_ID|REGISTRY_JSON)/;
const LEGACY_PROVIDER_FLAGS = new Set([
  "PAYMENT_STRIPE_ENABLED",
  "PAYMENT_PAYMOB_ENABLED",
]);
const SOURCE_ENV_ALLOWLIST = new Set([
  "CI",
  "HOSTNAME",
  "NO_COLOR",
  "NODE_ENV",
  "RUNTIME_GID",
  "RUNTIME_UID",
  "VERCEL_URL",
]);
const STRIPE_NAMES = new Set([
  "STRIPE_MODE",
  "STRIPE_PUBLISHABLE_KEY",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "STRIPE_API_BASE_URL",
  "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
]);
const PAYMOB_NAMES = new Set([
  "PAYMOB_MODE",
  "PAYMOB_API_KEY",
  "PAYMOB_PUBLIC_KEY",
  "PAYMOB_HMAC_SECRET",
  "PAYMOB_INTEGRATION_ID",
  "PAYMOB_INTEGRATION_ID_CARD",
  "PAYMOB_INTEGRATION_ID_WALLET",
  "PAYMOB_EGP_CARD_INTEGRATION_ID",
  "PAYMOB_EGP_WALLET_INTEGRATION_ID",
  "PAYMOB_USD_CARD_INTEGRATION_ID",
  "PAYMOB_IFRAME_ID",
  "PAYMOB_BASE_URL",
  "PAYMOB_INTENTION_BASE_URL",
  "PAYMOB_CHECKOUT_BASE_URL",
]);

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    args[key] = argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[++i] : true;
  }
  return args;
}

function unquote(value) {
  const trimmed = String(value ?? "").trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function parseEnvFile(filePath) {
  const values = new Map();
  const duplicates = new Set();
  if (!filePath) return { values, duplicates, missing: false };
  if (!fs.existsSync(filePath)) return { values, duplicates, missing: true };
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const match = line.match(/^(?:export\s+)?([A-Z][A-Z0-9_]*)\s*=\s*(.*)$/);
    if (!match) continue;
    const [, name, rawValue] = match;
    if (values.has(name)) duplicates.add(name);
    let value = rawValue.trim();
    if (!value.startsWith('"') && !value.startsWith("'"))
      value = value.split(/\s+#/)[0].trim();
    values.set(name, unquote(value));
  }
  return { values, duplicates, missing: false };
}

function parseSimpleYaml(filePath) {
  const entries = [];
  const allowedUntrackedPaths = [];
  let current = null;
  let section = "";
  for (const raw of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const line = raw.replace(/\t/g, "  ");
    if (/^variables:\s*$/.test(line)) {
      section = "variables";
      continue;
    }
    if (/^allowedUntrackedPaths:\s*$/.test(line)) {
      section = "allowed";
      continue;
    }
    if (section === "variables" && /^\s{2}-\s+name:\s*/.test(line)) {
      current = { name: unquote(line.replace(/^\s{2}-\s+name:\s*/, "")) };
      entries.push(current);
      continue;
    }
    if (
      section === "variables" &&
      current &&
      /^\s{4}[A-Za-z][A-Za-z0-9_]*:\s*/.test(line)
    ) {
      const match = line.match(/^\s{4}([A-Za-z][A-Za-z0-9_]*):\s*(.*)$/);
      current[match[1]] = parseYamlScalar(match[2]);
      continue;
    }
    if (section === "allowed" && /^\s{2}-\s+/.test(line)) {
      allowedUntrackedPaths.push(unquote(line.replace(/^\s{2}-\s+/, "")));
    }
  }
  return { entries, allowedUntrackedPaths };
}

function parseYamlScalar(value) {
  const trimmed = unquote(value);
  if (trimmed === "null") return null;
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  if (/^\[.*\]$/.test(trimmed))
    return trimmed
      .slice(1, -1)
      .split(",")
      .map((item) => unquote(item.trim()))
      .filter(Boolean);
  return trimmed;
}

function readText(filePath) {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return "";
  }
}

function deriveKnownNames() {
  const sources = [
    "sawiyaa-backend-v1/src/config/validation/env.schema.ts",
    "sawiyaa-backend-v1/src/config",
    "sawiyaa-frontend-v1/src",
    "sawiyaa-frontend-v1/next.config.ts",
    "docker-compose.prod.yml",
    "sawiyaa-backend-v1/Dockerfile",
    "sawiyaa-frontend-v1/Dockerfile",
  ];
  const known = new Set();
  for (const relative of sources) {
    const absolute = path.join(REPO_ROOT, relative);
    if (!fs.existsSync(absolute)) continue;
    const stat = fs.statSync(absolute);
    const files = stat.isDirectory()
      ? walkFiles(absolute).filter((file) =>
          /\.(ts|tsx|js|mjs|env|example|yml|yaml|tsconfig)$/.test(file),
        )
      : [absolute];
    for (const file of files) {
      const text = readText(file);
      for (const match of text.matchAll(
        /(?:\bprocess\.env\.|\bNEXT_PUBLIC_|\bARG\s+|\bENV\s+|^\s*)([A-Z][A-Z0-9_]+)\b/gm,
      ))
        known.add(match[1]);
    }
  }
  return known;
}

function walkFiles(directory) {
  const result = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (
      entry.isDirectory() &&
      !["node_modules", ".next", "dist", "generated"].includes(entry.name)
    )
      result.push(...walkFiles(file));
    else if (entry.isFile()) result.push(file);
  }
  return result;
}

function isPlaceholder(name, value, metadata = {}) {
  if (!value) return false;
  const lowered = value.toLowerCase();
  const patterns = [
    ...(metadata.placeholderPatterns || []),
    "<change-me>",
    "change-me",
    "your_",
    "xxxxxxxx",
    "ci-placeholder",
    "example.invalid",
    "<user>",
    "<password>",
    "<host>",
    "<db>",
  ];
  return (
    (lowered.startsWith("<") && lowered.endsWith(">")) ||
    patterns.some((pattern) =>
      lowered.includes(String(pattern).toLowerCase()),
    ) ||
    (SECRET_NAME_PATTERN.test(name) &&
      ["password", "secret", "token", "placeholder"].includes(lowered))
  );
}

function isValidBasic(name, value) {
  if (
    ["APP_ENV"].includes(name) &&
    !["development", "test", "staging", "production"].includes(value)
  )
    return false;
  if (
    name === "NODE_ENV" &&
    !["development", "test", "production"].includes(value)
  )
    return false;
  const booleanName =
    /^(?:GEOIP_ENABLED|NEXT_PUBLIC_PRACTITIONER_LOGIN_OTP_ENABLED|CONFIG_HTTP_ENABLED|LOG_HTTP_ENABLED|LOG_FILE_ENABLED|LOG_CONSOLE_ENABLED|LOG_STACK_ENABLED|LOG_NEST_INTERNAL_ENABLED|CLOUDFLARE_COUNTRY_HEADER_ENABLED|STEP_UP_ENABLED|AUTH_COOKIE_AUTH_ENABLED|AUTH_CSRF_ENFORCEMENT_ENABLED|MAIL_SECURE|DEV_OTP_BYPASS_DELIVERY_FAILURES|FINANCE_VAT_ENABLED|ACCOUNTING_RECONCILIATION_ENABLED|ACCOUNTING_RECONCILIATION_ALERTS_ENABLED)$/.test(
      name,
    ) ||
    name.startsWith("NEXT_PUBLIC_ENABLE_") ||
    name.startsWith("NEXT_PUBLIC_SHOW_");
  if (booleanName) return value === "true" || value === "false";
  if (
    ["PAYMOB_MODE", "STRIPE_MODE"].includes(name) &&
    !["test", "live"].includes(value)
  )
    return false;
  if (
    name === "PAYMOB_CHECKOUT_FLOW" &&
    !["legacy", "intention"].includes(value)
  )
    return false;
  if (
    name === "LOG_LEVEL" &&
    !["error", "warn", "info", "debug", "verbose"].includes(value)
  )
    return false;
  if (name === "MAIL_PROVIDER" && !["smtp", "brevo"].includes(value))
    return false;
  if (name === "THROTTLE_STORE" && !["memory", "redis"].includes(value))
    return false;
  if (name === "VIDEO_PROVIDER_DEFAULT" && value !== "DAILY") return false;
  if (name === "NEXT_PUBLIC_API_URL" && value.startsWith("/")) return true;
  if (name.endsWith("_URL") && !name.includes("DATABASE_URL")) {
    try {
      new URL(value);
    } catch {
      return false;
    }
  }
  return true;
}

function addIssue(issues, status, name, blocking = true) {
  issues.push({ status, name, blocking });
}

function sourceEnvironmentNames(files) {
  const names = new Set();
  for (const file of files || []) {
    const text = readText(file);
    for (const match of text.matchAll(
      /process\.env\.([A-Z][A-Z0-9_]*)|process\.env\[['"]([A-Z][A-Z0-9_]*)|\b(?:ARG|ENV)\s+([A-Z][A-Z0-9_]*)/g,
    )) {
      names.add(match[1] || match[2] || match[3]);
    }
  }
  return names;
}

function defaultSourceFiles(service) {
  const root = service === "frontend"
    ? path.join(REPO_ROOT, "sawiyaa-frontend-v1")
    : path.join(REPO_ROOT, "sawiyaa-backend-v1");
  const sourceRoot = path.join(root, "src");
  const files = walkFiles(sourceRoot).filter((file) =>
    /\.(ts|tsx|js|mjs)$/.test(file) &&
    !/\.(spec|test)\.[^.]+$/.test(path.basename(file)),
  );
  files.push(path.join(root, "Dockerfile"));
  if (service === "frontend") files.push(path.join(root, "next.config.ts"));
  return files;
}

function validateSourceExampleParity({
  service,
  examplePath,
  sourceFiles,
  issues,
}) {
  if (!examplePath || !fs.existsSync(examplePath)) return;
  const example = parseEnvFile(examplePath);
  for (const name of sourceEnvironmentNames(sourceFiles)) {
    if (!example.values.has(name) && !SOURCE_ENV_ALLOWLIST.has(name))
      addIssue(issues, STATUS.UNKNOWN, `${service}/source/${name}`, true);
  }
}

function parseProviderStateFile(filePath) {
  const states = new Map();
  if (!filePath || !fs.existsSync(filePath)) return states;
  for (const rawLine of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const match = rawLine.trim().match(/^(stripe|paymob)=(true|false)$/);
    if (match) states.set(match[1], match[2] === "true");
  }
  return states;
}

function providerState(providerStates, provider) {
  if (providerStates.has(provider))
    return providerStates.get(provider) ? "enabled" : "disabled";
  return "unknown";
}

function conditionalProviderDisabled(name, backend, providerStates) {
  if (STRIPE_NAMES.has(name))
    return providerState(providerStates, "stripe") !== "enabled";
  if (PAYMOB_NAMES.has(name))
    return providerState(providerStates, "paymob") !== "enabled";
  if (backend.get("MAIL_PROVIDER") === "brevo" &&
      ["MAIL_HOST", "MAIL_USER", "MAIL_PASS"].includes(name)) return true;
  if (backend.get("MAIL_PROVIDER") !== "brevo" && name === "BREVO_API_KEY")
    return true;
  if (name === "REDIS_URL" && backend.get("THROTTLE_STORE") !== "redis")
    return true;
  return false;
}

function validateStripeConfiguration(backend, frontend, providerStates, issues) {
  if (providerState(providerStates, "stripe") !== "enabled") return;
  const required = [
    ["STRIPE_PUBLISHABLE_KEY", backend],
    ["STRIPE_SECRET_KEY", backend],
    ["STRIPE_WEBHOOK_SECRET", backend],
    ["NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY", frontend],
  ];
  for (const [name, values] of required) {
    const value = values.get(name);
    if (!value?.trim()) addIssue(issues, STATUS.MISSING, name, true);
    else if (isPlaceholder(name, value))
      addIssue(issues, STATUS.PLACEHOLDER, name, true);
  }
  const mode = backend.get("STRIPE_MODE") || "test";
  const prefixes = mode === "live"
    ? [["STRIPE_PUBLISHABLE_KEY", "pk_live_"], ["STRIPE_SECRET_KEY", "sk_live_"]]
    : [["STRIPE_PUBLISHABLE_KEY", "pk_test_"], ["STRIPE_SECRET_KEY", "sk_test_"]];
  for (const [name, prefix] of prefixes) {
    const value = backend.get(name);
    if (value && !isPlaceholder(name, value) && !value.startsWith(prefix))
      addIssue(issues, STATUS.INVALID, name, true);
  }
  const frontendKey = frontend.get("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY");
  const expectedPrefix = mode === "live" ? "pk_live_" : "pk_test_";
  if (frontendKey && !isPlaceholder("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY", frontendKey) &&
      !frontendKey.startsWith(expectedPrefix))
    addIssue(issues, STATUS.INVALID, "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY", true);
}

function validatePaymobConfiguration(backend, providerStates, issues) {
  if (providerState(providerStates, "paymob") !== "enabled") return;
  for (const name of ["PAYMOB_API_KEY", "PAYMOB_HMAC_SECRET", "PAYMOB_BASE_URL"]) {
    const value = backend.get(name);
    if (!value?.trim()) addIssue(issues, STATUS.MISSING, name, true);
    else if (isPlaceholder(name, value)) addIssue(issues, STATUS.PLACEHOLDER, name, true);
  }
  const hasMethodRegistry = Boolean(backend.get("PAYMOB_METHOD_REGISTRY_JSON"));
  const hasLegacyCardRoute = Boolean(
    backend.get("PAYMOB_INTEGRATION_ID_CARD") || backend.get("PAYMOB_INTEGRATION_ID"),
  );
  if (!hasMethodRegistry && !hasLegacyCardRoute) {
    const value = backend.get("PAYMOB_EGP_CARD_INTEGRATION_ID");
    if (!value?.trim()) addIssue(issues, STATUS.MISSING, "PAYMOB_EGP_CARD_INTEGRATION_ID", true);
    else if (isPlaceholder("PAYMOB_EGP_CARD_INTEGRATION_ID", value))
      addIssue(issues, STATUS.PLACEHOLDER, "PAYMOB_EGP_CARD_INTEGRATION_ID", true);
  }
}

function validateProductionConfiguration(backend, frontend, providerStates, issues) {
  const required = [
    "WEB_APP_URL",
    "LOG_LEVEL",
    "DAILY_API_KEY",
    "DAILY_API_BASE_URL",
    "DAILY_WEBHOOK_SECRET",
    "CORPORATE_CODE_PEPPER",
  ];
  for (const name of required) {
    if (!backend.get(name)?.trim()) addIssue(issues, STATUS.MISSING, name);
  }

  const mailProvider = backend.get("MAIL_PROVIDER") || "smtp";
  const mailRequired =
    mailProvider === "brevo"
      ? ["BREVO_API_KEY", "MAIL_FROM"]
      : ["MAIL_HOST", "MAIL_USER", "MAIL_PASS", "MAIL_FROM"];
  for (const name of mailRequired) {
    if (!backend.get(name)?.trim()) addIssue(issues, STATUS.MISSING, name);
  }

  if (backend.get("THROTTLE_STORE") === "redis" && !backend.get("REDIS_URL"))
    addIssue(issues, STATUS.MISSING, "REDIS_URL");

  for (const name of [
    "APP_URL",
    "APP_BASE_URL",
    "WEB_APP_URL",
    "GOOGLE_CALLBACK_URL",
    "PAYMENT_SUCCESS_URL",
    "PAYMENT_FAILED_URL",
    "PAYMENT_PENDING_URL",
    "DAILY_API_BASE_URL",
  ]) {
    const value = backend.get(name);
    if (!value) continue;
    try {
      const url = new URL(value);
      if (url.protocol !== "https:") addIssue(issues, STATUS.INVALID, name);
      if (/^(localhost|127\.0\.0\.1|0\.0\.0\.0)$/i.test(url.hostname))
        addIssue(issues, STATUS.INVALID, name);
    } catch {
      addIssue(issues, STATUS.INVALID, name);
    }
  }

  if (backend.get("CORPORATE_CODE_PEPPER")?.trim().length < 32)
    addIssue(issues, STATUS.INVALID, "CORPORATE_CODE_PEPPER");
  validateStripeConfiguration(backend, frontend, providerStates, issues);
  validatePaymobConfiguration(backend, providerStates, issues);
}

function requirementEnabled(requirement, values) {
  if (requirement === true) return true;
  if (requirement === false || requirement == null) return false;
  const text = String(requirement);
  // Database-owned provider enablement is evaluated by the payment control
  // boundary, not by the ENV-only preflight parser.
  if (text.startsWith("database ")) return false;
  if (
    text.includes("GEOIP_ENABLED == true") &&
    values.get("GEOIP_ENABLED") !== "true"
  )
    return false;
  if (text.includes("no method registry/legacy card route")) {
    return (
      !values.get("PAYMOB_METHOD_REGISTRY_JSON") &&
      !values.get("PAYMOB_INTEGRATION_ID_CARD") &&
      !values.get("PAYMOB_INTEGRATION_ID") &&
      !values.get("PAYMOB_EGP_WALLET_INTEGRATION_ID") &&
      !values.get("PAYMOB_USD_CARD_INTEGRATION_ID")
    );
  }
  return true;
}

function entryAppliesToEnvironment(entry, environment) {
  return !Array.isArray(entry.environments) || entry.environments.includes(environment);
}

function canonicalExamplePath(filePath) {
  if (!filePath) return "";
  const directory = path.dirname(filePath);
  if (path.basename(filePath) === ".env.postgres")
    return path.join(directory, ".env.postgres.example");
  if (path.basename(filePath) === ".env")
    return path.join(directory, ".env.example");
  return "";
}

function validateExampleParity({
  service,
  actualPath,
  examplePath,
  values,
  contract,
  environment,
  issues,
}) {
  if (!examplePath || !fs.existsSync(examplePath)) return;
  const example = parseEnvFile(examplePath);
  for (const name of example.values.keys()) {
    const entry = contract.entries.find((item) => item.name === name);
    if (
      !values.has(name) &&
      entry &&
      entryAppliesToEnvironment(entry, environment) &&
      requirementEnabled(entry.required, values)
    )
      addIssue(issues, STATUS.MISSING, `${service}/${name}`);
  }
  for (const name of values.keys()) {
    if (!example.values.has(name) && !LEGACY_PROVIDER_FLAGS.has(name))
      addIssue(issues, STATUS.UNKNOWN, `${service}/${name}`, false);
  }
}

function validateDatabaseConsistency(backend, database, issues, environment) {
  const databaseUrl = backend.get("DATABASE_URL");
  const postgresDb = database.get("POSTGRES_DB");
  const postgresUser = database.get("POSTGRES_USER");
  if (!databaseUrl || !postgresDb || !postgresUser) return;
  let parsed;
  try {
    parsed = new URL(databaseUrl);
  } catch {
    return;
  }
  const databaseName = decodeURIComponent(parsed.pathname.replace(/^\//, "")).split("?")[0];
  if (databaseName !== postgresDb)
    addIssue(issues, STATUS.CONFLICT, "DATABASE_URL", true);
  if (decodeURIComponent(parsed.username) !== postgresUser)
    addIssue(issues, STATUS.CONFLICT, "DATABASE_URL", true);
  if (environment === "production" && !["postgres", "localhost", "127.0.0.1"].includes(parsed.hostname))
    addIssue(issues, STATUS.INVALID, "DATABASE_URL", true);
  if (parsed.port && parsed.port !== "5432")
    addIssue(issues, STATUS.INVALID, "DATABASE_URL", true);
}

function validateEnvironment(options = {}) {
  const environment = options.environment || "production";
  const contract =
    options.contract || parseSimpleYaml(options.contractPath || CONTRACT_PATH);
  const knownNames = options.knownNames || deriveKnownNames();
  const providerStates = options.providerStates || new Map();
  const issues = [];
  const files = [
    ["backend", options.backendEnv],
    ["frontend", options.frontendEnv],
    ["database", options.dbEnv],
  ].filter(([, file]) => file);
  const parsed = new Map();
  const metadata = new Map(
    contract.entries.map((entry) => [entry.name, entry]),
  );
  const aliases = new Map();
  for (const entry of contract.entries) {
    for (const alias of [
      ...(entry.aliases || []),
      ...(entry.deprecatedAliases || []),
    ])
      aliases.set(alias, entry);
  }

  for (const [service, file] of files) parsed.set(service, parseEnvFile(file));
  for (const [service, file] of files) {
    const env = parsed.get(service);
    const backendValues = parsed.get("backend")?.values || new Map();
    if (env.missing) {
      addIssue(issues, STATUS.MISSING, `${service.toUpperCase()}_ENV_FILE`);
      continue;
    }
    for (const name of env.duplicates) addIssue(issues, STATUS.CONFLICT, name);
    for (const [name, value] of env.values) {
      if (name === "PAYMENT_PROVIDER_ROUTES_JSON") {
        addIssue(issues, STATUS.CONFLICT, name);
        continue;
      }
      const entry = metadata.get(name);
      const aliasEntry = aliases.get(name);
      const appliesToEnvironment =
        !entry || entryAppliesToEnvironment(entry, environment);
      if (
        !knownNames.has(name) &&
        !metadata.has(name) &&
        !aliasEntry &&
        !LEGACY_PROVIDER_FLAGS.has(name)
      )
        addIssue(issues, STATUS.UNKNOWN, name, false);
      if (
        !knownNames.has(name) &&
        entry &&
        !entry.deprecated &&
        !["deployment", "database"].includes(entry.service)
      )
        addIssue(issues, STATUS.UNKNOWN, name, false);
      const required =
        (appliesToEnvironment &&
          Boolean(entry && requirementEnabled(entry.required, env.values))) ||
        name === "DATABASE_URL" ||
        name.endsWith("_SECRET") ||
        name.endsWith("_PASSWORD");
      const conditionallyDisabled = conditionalProviderDisabled(name, backendValues, providerStates);
      if (value === "") addIssue(issues, STATUS.EMPTY, name, required && !conditionallyDisabled);
      else if (isPlaceholder(name, value, entry))
        addIssue(issues, STATUS.PLACEHOLDER, name, !conditionallyDisabled);
      else if (!isValidBasic(name, value))
        addIssue(issues, STATUS.INVALID, name, !conditionallyDisabled);
      else if (aliasEntry) addIssue(issues, STATUS.DEPRECATED, name, false);
      else if (entry?.deprecated)
        addIssue(issues, STATUS.DEPRECATED, name, false);
      else addIssue(issues, STATUS.PRESENT, name, false);
    }
  }

  const backend = parsed.get("backend")?.values || new Map();
  const frontend = parsed.get("frontend")?.values || new Map();
  const db = parsed.get("database")?.values || new Map();
  validateExampleParity({
    service: "backend/.env",
    actualPath: options.backendEnv,
    examplePath: options.backendExample || canonicalExamplePath(options.backendEnv),
    values: backend,
    contract,
    environment,
    issues,
  });
  validateSourceExampleParity({
    service: "backend",
    examplePath: options.backendExample || canonicalExamplePath(options.backendEnv),
    sourceFiles: options.sourceFiles?.backend || defaultSourceFiles("backend"),
    issues,
  });
  validateSourceExampleParity({
    service: "frontend",
    examplePath: options.frontendExample || canonicalExamplePath(options.frontendEnv),
    sourceFiles: options.sourceFiles?.frontend || defaultSourceFiles("frontend"),
    issues,
  });
  validateExampleParity({
    service: "frontend/.env",
    actualPath: options.frontendEnv,
    examplePath: options.frontendExample || canonicalExamplePath(options.frontendEnv),
    values: frontend,
    contract,
    environment,
    issues,
  });
  validateExampleParity({
    service: "backend/.env.postgres",
    actualPath: options.dbEnv,
    examplePath: options.dbExample || canonicalExamplePath(options.dbEnv),
    values: db,
    contract,
    environment,
    issues,
  });
  validateDatabaseConsistency(backend, db, issues, environment);
  for (const entry of contract.entries) {
    if (entry.name === "PAYMENT_PROVIDER_ROUTES_JSON") continue;
    const target =
      entry.service === "frontend"
        ? frontend
        : entry.service === "database"
          ? db
          : backend;
    if (
      entryAppliesToEnvironment(entry, environment) &&
      requirementEnabled(entry.required, target) &&
      !target.has(entry.name)
    )
      addIssue(issues, STATUS.MISSING, entry.name);
    if (
      !target.has(entry.name) &&
      (!entryAppliesToEnvironment(entry, environment) || entry.required === false)
    )
      addIssue(issues, STATUS.NOT_REQUIRED, entry.name, false);
    if (
      knownNames.has(entry.name) === false &&
      !["deployment", "database"].includes(entry.service) &&
      !entry.deprecated
    ) {
      addIssue(issues, STATUS.UNKNOWN, entry.name, false);
    }
  }
  if (
    backend.get("GEOIP_ENABLED") === "true" &&
    !backend.get("GEOIP_DATABASE_PATH")
  )
    addIssue(issues, STATUS.MISSING, "GEOIP_DATABASE_PATH");
  const canonical = backend.get("PAYMOB_EGP_CARD_INTEGRATION_ID");
  const legacy =
    backend.get("PAYMOB_INTEGRATION_ID_CARD") ||
    backend.get("PAYMOB_INTEGRATION_ID");
  if (canonical && legacy && canonical !== legacy)
    addIssue(issues, STATUS.CONFLICT, "PAYMOB_EGP_CARD_INTEGRATION_ID");
  if (environment !== "production" && backend.get("PAYMOB_MODE") === "live")
    addIssue(issues, STATUS.INVALID, "PAYMOB_MODE");
  if (environment === "production")
    validateProductionConfiguration(backend, frontend, providerStates, issues);
  return {
    issues,
    blocking: issues.some(
      (issue) =>
        issue.blocking &&
        ![STATUS.PRESENT, STATUS.NOT_REQUIRED, STATUS.DEPRECATED].includes(
          issue.status,
        ),
    ),
    contract,
    knownNames,
  };
}

function formatReport(result) {
  const seen = new Set();
  const lines = [];
  const actionable = result.issues.filter(
    (issue) => ![STATUS.PRESENT, STATUS.NOT_REQUIRED].includes(issue.status),
  );
  const blockers = actionable.filter(
    (issue) => issue.blocking &&
      ![STATUS.PRESENT, STATUS.NOT_REQUIRED].includes(issue.status),
  );
  const warnings = actionable.filter((issue) => !issue.blocking);
  for (const issue of actionable) {
    const key = `${issue.status}:${issue.name}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const prefix = issue.blocking ? "BLOCKING_ENV" : "WARNING_ENV";
    lines.push(`${prefix} ${issue.name} reason="${issue.status.toLowerCase()}"`);
  }
  lines.push(`ENVIRONMENT_CONTRACT_SUMMARY blockers=${blockers.length} warnings=${warnings.length}`);
  lines.push(`ENVIRONMENT: ${blockers.length === 0 ? "READY" : "FAILED"}`);
  return lines.join("\n");
}

function isAllowedOperationalPath(
  relativePath,
  allowlist = [
    "deploy/certs/",
    "deploy/certbot-logs/",
    "deploy-build.pid",
    "*.before-*",
  ],
) {
  return allowlist.some((allowed) => {
    if (allowed.endsWith("/")) return relativePath.startsWith(allowed);
    if (allowed === "*.before-*")
      return path.basename(relativePath).includes(".before-");
    return relativePath === allowed;
  });
}

function classifyGitPaths(statusLines, allowlist) {
  return statusLines.filter(Boolean).map((line) => {
    const code = line.slice(0, 2);
    const relativePath = line.slice(3);
    if (code !== "??")
      return { path: relativePath, status: "BLOCKING_TRACKED_DIRTY" };
    return {
      path: relativePath,
      status: isAllowedOperationalPath(relativePath, allowlist)
        ? "ALLOWED_UNTRACKED"
        : "BLOCKING_UNEXPECTED_UNTRACKED",
    };
  });
}

function isGeoIpReady(enabled, databasePath, stat = fs.statSync) {
  if (enabled !== "true") return { status: STATUS.NOT_REQUIRED };
  if (!databasePath) return { status: STATUS.MISSING };
  try {
    const info = stat(databasePath);
    return info.isFile() && info.size > 0
      ? { status: STATUS.PRESENT }
      : { status: STATUS.INVALID };
  } catch {
    return { status: STATUS.MISSING };
  }
}

function diskSpaceIsSufficient(freeMb, minimumMb) {
  return Number.isFinite(Number(freeMb)) && Number(freeMb) >= Number(minimumMb);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.backendEnv && !args.frontendEnv && !args.dbEnv) {
    console.error("MISSING ENVIRONMENT_INPUT");
    process.exitCode = 2;
    return;
  }
  const result = validateEnvironment({
    backendEnv: args.backendEnv,
    frontendEnv: args.frontendEnv,
    dbEnv: args.dbEnv,
    providerStates: parseProviderStateFile(args.providerStateFile),
    environment: args.environment || "production",
  });
  process.stdout.write(`${formatReport(result)}\n`);
  process.exitCode = result.blocking ? 1 : 0;
}

module.exports = {
  STATUS,
  parseArgs,
  parseEnvFile,
  parseSimpleYaml,
  deriveKnownNames,
  isPlaceholder,
  validateEnvironment,
  sourceEnvironmentNames,
  validateSourceExampleParity,
  formatReport,
  isAllowedOperationalPath,
  classifyGitPaths,
  isGeoIpReady,
  diskSpaceIsSufficient,
};

if (require.main === module) main();
