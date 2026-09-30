'use strict';

const fs = require('node:fs');
const path = require('node:path');

const SECRET_KEY = /(SECRET|PASSWORD|TOKEN|API_KEY|PRIVATE|HMAC|DATABASE_URL|INTEGRATION_ID|CLIENT_SECRET|MAIL_PASS)/;
const PLACEHOLDER = /(<[^>]+>|change[-_ ]?me|your[-_ ]|placeholder|example)/i;
const PRODUCTION_SAFE_DEFAULTS = new Set([
  'SERVICE_NAME',
  'LOG_HTTP_ENABLED', 'LOG_FILE_ENABLED', 'LOG_CONSOLE_ENABLED', 'LOG_NEST_INTERNAL_ENABLED',
  'LOG_DIR', 'LOG_SLOW_REQUEST_MS', 'LOG_RETENTION_DAYS', 'LOG_MAX_FILE_SIZE',
  'AVAILABILITY_FUTURE_WEEKS_ALLOWED', 'AVAILABILITY_RETENTION_MONTHS', 'AVAILABILITY_REPEAT_PREVIEW_TTL_MINUTES',
  'THROTTLE_STORE', 'THROTTLE_KEY_PREFIX',
  'NOTIFICATION_QUEUE_ENABLED', 'NOTIFICATION_QUEUE_PREFIX', 'NOTIFICATION_QUEUE_CONNECTION_TIMEOUT_MS',
  'NOTIFICATION_WORKER_CONCURRENCY', 'NOTIFICATION_WORKER_HEARTBEAT_INTERVAL_MS',
  'DAILY_ATTENDANCE_QUEUE_ENABLED', 'OPERATIONS_QUEUE_PREFIX', 'OPERATIONS_QUEUE_CONNECTION_TIMEOUT_MS',
  'DAILY_ATTENDANCE_WORKER_CONCURRENCY', 'OPERATIONS_WORKER_HEARTBEAT_INTERVAL_MS',
  'ACCOUNTING_RECONCILIATION_ENABLED', 'ACCOUNTING_RECONCILIATION_LOOKBACK_DAYS',
  'ACCOUNTING_RECONCILIATION_BATCH_SIZE', 'ACCOUNTING_RECONCILIATION_CRON',
  'ACCOUNTING_RECONCILIATION_ALERTS_ENABLED', 'ACCOUNTING_RECONCILIATION_PENDING_PAYMENT_THRESHOLD_MINUTES',
  'SESSION_ATTENDANCE_RECONCILIATION_SWEEPER_ENABLED', 'SESSION_COMPLETION_CONFIRMATION_SWEEPER_GRACE_MINUTES',
  'FINANCIAL_OVERVIEW_SLOW_MS', 'PRACTITIONER_REVIEW_SLA_WEEKEND_DAYS', 'PRACTITIONER_REVIEW_SLA_TIMEZONE',
  'FINANCE_VAT_ENABLED', 'FINANCE_VAT_RATE_PERCENT', 'FINANCE_GATEWAY_FEE_RATE_PERCENT',
  'FINANCE_GATEWAY_FEE_FIXED_AMOUNT', 'VIDEO_PROVIDER_DEFAULT',
]);

function parseEnvFile(filePath) {
  const values = new Map();
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*(?:export\s+)?([A-Z][A-Z0-9_]*)\s*=\s*(.*)$/);
    if (match) values.set(match[1], match[2].trim());
  }
  return values;
}

function stripQuotes(value) {
  const text = String(value ?? '').trim();
  if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'")))
    return text.slice(1, -1);
  return text;
}

function isSecretKey(name) {
  return SECRET_KEY.test(name);
}

function isUsableFallback(name, value) {
  const text = stripQuotes(value);
  return text !== '' && !(isSecretKey(name) || PLACEHOLDER.test(text));
}

function envKeys(filePath) {
  return [...parseEnvFile(filePath).keys()];
}

function databaseParts(databaseUrl) {
  try {
    const parsed = new URL(stripQuotes(databaseUrl));
    return {
      database: decodeURIComponent(parsed.pathname.replace(/^\//, '')).split('?')[0],
      user: decodeURIComponent(parsed.username),
      password: decodeURIComponent(parsed.password),
    };
  } catch {
    return { database: '', user: '', password: '' };
  }
}

function chooseValue(name, { source, fallback, production, forced }) {
  if (forced.has(name)) return forced.get(name);
  if (source.has(name) && (!production || !PLACEHOLDER.test(stripQuotes(source.get(name)))))
    return source.get(name);
  if (production)
    return PRODUCTION_SAFE_DEFAULTS.has(name) && isUsableFallback(name, fallback.get(name))
      ? fallback.get(name)
      : '';
  return isUsableFallback(name, fallback.get(name)) ? fallback.get(name) : '';
}

function renderLayout(layoutPath, outputPath, options) {
  const { source, fallback, production, forced = new Map() } = options;
  const rendered = fs.readFileSync(layoutPath, 'utf8').split(/\r?\n/).map((line) => {
    const match = line.match(/^(\s*)(?:export\s+)?([A-Z][A-Z0-9_]*)\s*=\s*(.*)$/);
    if (!match) return line;
    const [, indentation, name] = match;
    return `${indentation}${name}=${chooseValue(name, { source, fallback, production, forced })}`;
  }).join('\n');
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, rendered.endsWith('\n') ? rendered : `${rendered}\n`, { mode: 0o600 });
}

function buildFiles(options) {
  const backendExample = parseEnvFile(options.backendExample);
  const backendLocal = parseEnvFile(options.backendLocal);
  const backendBackup = parseEnvFile(options.backendBackup);
  const frontendExample = parseEnvFile(options.frontendExample);
  const frontendLocal = parseEnvFile(options.frontendLocal);
  const frontendEvidence = parseEnvFile(options.frontendEvidence);

  const localDb = databaseParts(backendLocal.get('DATABASE_URL'));
  const productionDb = databaseParts(backendBackup.get('DATABASE_URL'));

  const localForced = new Map([
    ['POSTGRES_DB', localDb.database || backendLocal.get('DB') || ''],
    ['POSTGRES_USER', localDb.user || backendLocal.get('USER') || ''],
    ['POSTGRES_PASSWORD', localDb.password || backendLocal.get('PASSWORD') || ''],
    ['PGDATA', '/var/lib/postgresql/data/pgdata'],
  ]);
  const productionForced = new Map([
    ['APP_ENV', 'production'],
    ['NODE_ENV', 'production'],
    ['APP_VERSION', ''],
    ['DEPLOYMENT_ID', ''],
    ['SAWIYAA_DEV_COUNTRY_CODE', ''],
    ['POSTGRES_DB', productionDb.database],
    ['POSTGRES_USER', productionDb.user],
    ['POSTGRES_PASSWORD', productionDb.password],
    ['PGDATA', '/var/lib/postgresql/data/pgdata'],
  ]);
  const publicAppUrl = stripQuotes(frontendEvidence.get('NEXT_PUBLIC_APP_URL'));
  if (publicAppUrl && !PLACEHOLDER.test(publicAppUrl)) {
    productionForced.set('WEB_APP_URL', publicAppUrl);
    for (const name of ['APP_URL', 'APP_BASE_URL', 'PAYMENT_SUCCESS_URL', 'PAYMENT_FAILED_URL', 'PAYMENT_PENDING_URL']) {
      const sourceValue = stripQuotes(backendBackup.get(name));
      try {
        const parsed = new URL(sourceValue);
        const isLocalOrigin = ['localhost', '127.0.0.1', '0.0.0.0'].includes(parsed.hostname) || parsed.protocol !== 'https:';
        if (isLocalOrigin) productionForced.set(name, new URL(`${parsed.pathname}${parsed.search}${parsed.hash}`, publicAppUrl).toString());
      } catch {
        if (name === 'APP_URL' || name === 'APP_BASE_URL') productionForced.set(name, publicAppUrl);
      }
    }
  }

  renderLayout(options.backendExample, options.backendLocal, {
    source: backendLocal,
    fallback: backendExample,
    production: false,
    forced: localForced,
  });
  renderLayout(options.backendExample, options.backendProduction, {
    source: backendBackup,
    fallback: backendExample,
    production: true,
    forced: productionForced,
  });
  renderLayout(options.frontendExample, options.frontendLocal, {
    source: frontendLocal,
    fallback: frontendExample,
    production: false,
  });
  renderLayout(options.frontendExample, options.frontendProduction, {
    source: frontendEvidence,
    fallback: frontendExample,
    production: true,
    forced: new Map([['NEXT_PUBLIC_APP_ENV', 'production']]),
  });
}

function migrationReport({ backendLocal, backendProduction, backendBackup }) {
  const local = envKeys(backendLocal);
  const production = envKeys(backendProduction);
  const backup = envKeys(backendBackup);
  const productionSet = new Set(production);
  const backupSet = new Set(backup);
  const localSet = new Set(local);
  return {
    migrated: backup.filter((name) => productionSet.has(name)),
    obsolete: backup.filter((name) => !productionSet.has(name)),
    newlyRequired: production.filter((name) => !backupSet.has(name)),
    localOnlyRetired: local.filter((name) => !productionSet.has(name) && !backupSet.has(name)),
    productionKeys: production,
    localKeys: local,
  };
}

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const name = argv[index];
    if (name.startsWith('--')) {
      const key = name.slice(2).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
      const next = argv[index + 1];
      if (next && !next.startsWith('--')) args[key] = argv[++index];
      else args[key] = true;
    }
  }
  return args;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const required = [
    'backendExample', 'backendLocal', 'backendBackup', 'backendProduction',
    'frontendExample', 'frontendLocal', 'frontendEvidence', 'frontendProduction',
  ];
  for (const name of required) if (!args[name]) throw new Error(`Missing --${name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`);
  buildFiles(args);
  if (args.report) {
    const report = migrationReport(args);
    process.stdout.write(`${JSON.stringify({
      migrated: report.migrated,
      obsolete: report.obsolete,
      newlyRequired: report.newlyRequired,
      localOnlyRetired: report.localOnlyRetired,
    })}\n`);
  }
}

module.exports = {
  parseEnvFile,
  envKeys,
  databaseParts,
  buildFiles,
  migrationReport,
};

if (require.main === module) main();
