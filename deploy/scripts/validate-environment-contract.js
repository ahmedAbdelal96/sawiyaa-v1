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

function validateProductionConfiguration(backend, issues) {
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
}

function validateServerPublicUrls(backend, frontend, issues) {
  const browserFacing = [
    ["backend", "APP_URL"], ["backend", "WEB_APP_URL"], ["backend", "APP_BASE_URL"],
    ["frontend", "NEXT_PUBLIC_APP_URL"], ["frontend", "NEXT_PUBLIC_SITE_URL"],
    ["frontend", "NEXT_PUBLIC_CHAT_SOCKET_URL"],
  ];
  for (const [service, name] of browserFacing) {
    const value = (service === "backend" ? backend : frontend).get(name);
    if (!value) { addIssue(issues, STATUS.MISSING, name); continue; }
    try {
      const url = new URL(value);
      if (!/^https?:$/.test(url.protocol) || /^(localhost|127\.0\.0\.1|0\.0\.0\.0|SERVER_HOST)$/i.test(url.hostname))
        addIssue(issues, STATUS.INVALID, name);
    } catch { addIssue(issues, STATUS.INVALID, name); }
  }
  const cors = backend.get("CORS_ORIGINS");
  if (!cors) addIssue(issues, STATUS.MISSING, "CORS_ORIGINS");
  else for (const origin of cors.split(",").map((item) => item.trim()).filter(Boolean)) {
    try {
      const url = new URL(origin);
      if (/^(localhost|127\.0\.0\.1|0\.0\.0\.0|SERVER_HOST)$/i.test(url.hostname)) addIssue(issues, STATUS.INVALID, "CORS_ORIGINS");
    } catch { addIssue(issues, STATUS.INVALID, "CORS_ORIGINS"); }
  }
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

function validateEnvironment(options = {}) {
  const environment = options.environment || "production";
  const contract =
    options.contract || parseSimpleYaml(options.contractPath || CONTRACT_PATH);
  const knownNames = options.knownNames || deriveKnownNames();
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

  for (const [service, file] of files) {
    const env = parseEnvFile(file);
    parsed.set(service, env);
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
      if (!knownNames.has(name) && !metadata.has(name) && !aliasEntry)
        addIssue(issues, STATUS.UNKNOWN, name, environment === "production");
      if (
        !knownNames.has(name) &&
        entry &&
        !entry.deprecated &&
        !["deployment", "database"].includes(entry.service)
      )
        addIssue(issues, STATUS.UNKNOWN, name, environment === "production");
      const required =
        name === "DATABASE_URL" ||
        Boolean(
          entry &&
            appliesToEnvironment &&
            requirementEnabled(entry.required, env.values),
        );
      if (value === "") addIssue(issues, STATUS.EMPTY, name, required);
      else if (isPlaceholder(name, value, entry))
        addIssue(issues, STATUS.PLACEHOLDER, name, required);
      else if (!isValidBasic(name, value))
        addIssue(issues, STATUS.INVALID, name, required);
      else if (aliasEntry) addIssue(issues, STATUS.DEPRECATED, name, false);
      else if (entry?.deprecated)
        addIssue(issues, STATUS.DEPRECATED, name, false);
      else addIssue(issues, STATUS.PRESENT, name, false);
    }
  }

  const backend = parsed.get("backend")?.values || new Map();
  const frontend = parsed.get("frontend")?.values || new Map();
  const db = parsed.get("database")?.values || new Map();
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
      addIssue(issues, STATUS.UNKNOWN, entry.name, environment === "production");
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
    validateProductionConfiguration(backend, issues);
  if (options.requirePublicUrl) validateServerPublicUrls(backend, frontend, issues);
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
    environment,
    envFiles: {
      backend: options.backendEnv || "",
      frontend: options.frontendEnv || "",
      database: options.dbEnv || "",
    },
  };
}

function displayEnvFile(file) {
  if (!file) return "NOT PROVIDED";
  const absolute = path.resolve(file);
  const relative = path.relative(process.cwd(), absolute);
  return relative && !relative.startsWith("..") ? relative.replaceAll(path.sep, "/") : path.basename(absolute);
}

function formatReport(result) {
  const seen = new Set();
  const lines = [];
  const blockers = [];
  const warnings = [];
  lines.push(`ENVIRONMENT=${result.environment || "unknown"}`);
  lines.push(`BACKEND_ENV_FILE=${displayEnvFile(result.envFiles?.backend)}`);
  lines.push(`FRONTEND_ENV_FILE=${displayEnvFile(result.envFiles?.frontend)}`);
  for (const issue of result.issues) {
    const key = `${issue.status}:${issue.name}`;
    if (seen.has(key)) continue;
    seen.add(key);
    lines.push(`${issue.status} ${issue.name}`);
    if (
      issue.blocking &&
      ![STATUS.PRESENT, STATUS.NOT_REQUIRED, STATUS.DEPRECATED].includes(
        issue.status,
      )
    )
      blockers.push(issue);
    else if (![STATUS.PRESENT, STATUS.NOT_REQUIRED].includes(issue.status))
      warnings.push(issue);
  }
  lines.push(
    `ENVIRONMENT_CONTRACT_SUMMARY blockers=${blockers.length} warnings=${warnings.length}`,
  );
  if (blockers.length) {
    lines.push("BLOCKERS:");
    for (const issue of blockers)
      lines.push(`- ${issue.name} reason="${issue.status.toLowerCase()}"`);
  }
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
    environment: args.environment || "production",
    requirePublicUrl: Boolean(args.requirePublicUrl),
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
  formatReport,
  isAllowedOperationalPath,
  classifyGitPaths,
  isGeoIpReady,
  diskSpaceIsSufficient,
};

if (require.main === module) main();
