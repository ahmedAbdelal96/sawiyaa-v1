'use strict';

const fs = require('node:fs');
const path = require('node:path');

const BLOCKING_RULES = [
  ['DROP_TABLE', /^\s*DROP\s+TABLE\b/i],
  ['DROP_COLUMN', /^\s*ALTER\s+TABLE\b.*\bDROP\s+COLUMN\b/i],
  ['TRUNCATE', /^\s*TRUNCATE\b/i],
  ['DROP_TYPE', /^\s*DROP\s+TYPE\b/i],
  ['RENAME_TABLE', /^\s*ALTER\s+TABLE\b.*\bRENAME\s+TO\b/i],
  ['RENAME_COLUMN', /^\s*ALTER\s+TABLE\b.*\bRENAME\s+COLUMN\b/i],
  ['ALTER_COLUMN_TYPE', /^\s*ALTER\s+TABLE\b.*\bALTER\s+COLUMN\b.*\bTYPE\b/i],
];

const REVIEW_RULES = [
  ['CREATE_UNIQUE_INDEX', /^\s*CREATE\s+UNIQUE\s+INDEX\b/i],
  ['ADD_UNIQUE_CONSTRAINT', /^\s*ALTER\s+TABLE\b.*\bADD\s+CONSTRAINT\b.*\bUNIQUE\b/i],
  ['LARGE_UPDATE', /^\s*UPDATE\b/i],
  ['DATA_BACKFILL', /^\s*INSERT\s+INTO\b/i],
  ['ENUM_ALTERATION', /^\s*ALTER\s+TYPE\b.*\bADD\s+VALUE\b/i],
  ['NON_CONCURRENT_INDEX', /^\s*CREATE\s+(?:UNIQUE\s+)?INDEX\b(?!.*\bCONCURRENTLY\b)/i],
  ['NOT_NULL_WITH_DEFAULT', /^\s*ALTER\s+TABLE\b.*\bSET\s+NOT\s+NULL\b/i],
];

function parseArgs(argv) {
  const options = { migrationsDir: null, appliedFile: null, approve: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--migrations-dir') options.migrationsDir = argv[++i];
    else if (arg === '--applied-file') options.appliedFile = argv[++i];
    else if (arg === '--approve-blocking-migrations') options.approve = true;
    else if (arg === '--help') options.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return options;
}

function migrationDirectories(migrationsDir, appliedFile) {
  const applied = appliedFile && fs.existsSync(appliedFile)
    ? new Set(fs.readFileSync(appliedFile, 'utf8').split(/\r?\n/).map((line) => line.trim()).filter(Boolean))
    : null;
  return fs.readdirSync(migrationsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && (!applied || !applied.has(entry.name)))
    .map((entry) => entry.name)
    .sort();
}

function classifyMigration(directory, migrationsDir) {
  const file = path.join(migrationsDir, directory, 'migration.sql');
  const sql = fs.readFileSync(file, 'utf8');
  const findings = [];
  const lines = sql.split(/\r?\n/);
  const add = (classification, rule, line) => findings.push({ classification, rule, line });

  lines.forEach((line, index) => {
    for (const [rule, pattern] of BLOCKING_RULES) if (pattern.test(line)) add('BLOCKING', rule, index + 1);
    for (const [rule, pattern] of REVIEW_RULES) if (pattern.test(line)) add('REVIEW_REQUIRED', rule, index + 1);
    if (/^\s*DELETE\s+FROM\b/i.test(line) && !/\bWHERE\b/i.test(line)) add('BLOCKING', 'DELETE_WITHOUT_WHERE', index + 1);
    if (/\bSET\s+NOT\s+NULL\b/i.test(line) && !/\bDEFAULT\b/i.test(line) && !/\bUPDATE\b/i.test(sql.slice(0, sql.indexOf(line)))) add('BLOCKING', 'NOT_NULL_WITHOUT_BACKFILL', index + 1);
    if (/\b(?:DROP|TRUNCATE|DELETE|RENAME)\b.*\b(?:payment|wallet|ledger|settlement|payout|refund)\b/i.test(line)) add('BLOCKING', 'FINANCIAL_STRUCTURE_REMOVAL', index + 1);
  });
  const classification = findings.some((item) => item.classification === 'BLOCKING') ? 'BLOCKING' : findings.length ? 'REVIEW_REQUIRED' : 'SAFE';
  return { directory, classification, findings };
}

function scan(options) {
  if (!options.migrationsDir) throw new Error('--migrations-dir is required');
  const results = migrationDirectories(options.migrationsDir, options.appliedFile).map((directory) => classifyMigration(directory, options.migrationsDir));
  const hasBlocking = results.some((result) => result.classification === 'BLOCKING');
  const classification = hasBlocking ? (options.approve ? 'APPROVED' : 'BLOCKED') : results.some((result) => result.classification === 'REVIEW_REQUIRED') ? 'REVIEW_REQUIRED' : 'SAFE';
  return { classification, results };
}

function formatReport(report) {
  const lines = [`MIGRATIONS: ${report.classification}`];
  for (const result of report.results) {
    lines.push(`${result.directory}: ${result.classification}`);
    for (const finding of result.findings) lines.push(`  ${finding.rule} line=${finding.line}`);
  }
  return `${lines.join('\n')}\n`;
}

if (require.main === module) {
  try {
    const options = parseArgs(process.argv.slice(2));
    if (options.help) { console.log('Usage: node check-migration-safety.js --migrations-dir <dir> [--applied-file <file>] [--approve-blocking-migrations]'); process.exit(0); }
    const report = scan(options);
    process.stdout.write(formatReport(report));
    process.exitCode = report.classification === 'BLOCKED' ? 2 : 0;
  } catch (error) {
    console.error(`MIGRATIONS: FAILED: ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = { scan, classifyMigration, formatReport, migrationDirectories };
