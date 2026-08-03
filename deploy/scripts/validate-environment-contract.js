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
        /\b(?:process\.env\.|NEXT_PUBLIC_|ARG\s+|ENV\s+|^\s*)([A-Z][A-Z0-9_]+)\b/gm,
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
      if (!knownNames.has(name) && !metadata.has(name) && !aliasEntry)
        addIssue(issues, STATUS.UNKNOWN, name);
      if (
        !knownNames.has(name) &&
        entry &&
        !entry.deprecated &&
        !["deployment", "database"].includes(entry.service)
      )
        addIssue(issues, STATUS.UNKNOWN, name);
      const required =
        Boolean(entry && requirementEnabled(entry.required, env.values)) ||
        name === "DATABASE_URL" ||
        name.endsWith("_SECRET") ||
        name.endsWith("_PASSWORD");
      if (value === "") addIssue(issues, STATUS.EMPTY, name, required);
      else if (isPlaceholder(name, value, entry))
        addIssue(issues, STATUS.PLACEHOLDER, name);
      else if (!isValidBasic(name, value))
        addIssue(issues, STATUS.INVALID, name);
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
    if (requirementEnabled(entry.required, target) && !target.has(entry.name))
      addIssue(issues, STATUS.MISSING, entry.name);
    if (!target.has(entry.name) && entry.required === false)
      addIssue(issues, STATUS.NOT_REQUIRED, entry.name, false);
    if (
      knownNames.has(entry.name) === false &&
      !["deployment", "database"].includes(entry.service) &&
      !entry.deprecated
    ) {
      addIssue(issues, STATUS.UNKNOWN, entry.name);
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
  for (const issue of result.issues) {
    const key = `${issue.status}:${issue.name}`;
    if (seen.has(key)) continue;
    seen.add(key);
    lines.push(`${issue.status} ${issue.name}`);
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
