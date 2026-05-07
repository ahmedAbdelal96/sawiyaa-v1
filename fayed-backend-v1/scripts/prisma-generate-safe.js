const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const MAX_ATTEMPTS = 8;
const RETRY_DELAY_MS = 2000;
const PRISMA_ENTRY = path.resolve(__dirname, '..', 'node_modules', 'prisma', 'build', 'index.js');
const PRISMA_ARGS = [
  'generate',
  '--schema',
  path.resolve(__dirname, '..', 'prisma', 'schema.prisma'),
  '--config',
  path.resolve(__dirname, '..', 'prisma.config.ts'),
];
const GENERATED_CLIENT_DIR = path.resolve(__dirname, '..', 'src', 'generated', 'prisma');
const PRISMA_CLIENT_PACKAGE_DIR = path.resolve(__dirname, '..', 'node_modules', '@prisma', 'client');

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function cleanupTemporaryClientFiles() {
  if (!fs.existsSync(GENERATED_CLIENT_DIR)) {
    return;
  }

  for (const entry of fs.readdirSync(GENERATED_CLIENT_DIR)) {
    if (!entry.includes('.tmp')) {
      continue;
    }

    const filePath = path.join(GENERATED_CLIENT_DIR, entry);
    try {
      fs.unlinkSync(filePath);
    } catch {
      // Ignore locked temp files and let the retry handle transient Windows locks.
    }
  }
}

function isWindowsRenameLockIssue(result) {
  const output = `${result.stdout ?? ''}\n${result.stderr ?? ''}`;
  const errorMessage = result.error ? String(result.error.message || result.error) : '';

  return (
    (/EPERM/i.test(output) && /rename/i.test(output) && /query_engine-windows\.dll\.node/i.test(output)) ||
    (/EPERM/i.test(errorMessage) && /query_engine-windows\.dll\.node/i.test(errorMessage))
  );
}

function writeResultOutput(result) {
  if (result.stdout) {
    process.stdout.write(result.stdout);
  }

  if (result.stderr) {
    process.stderr.write(result.stderr);
  }
}

function patchPrismaClientPackage() {
  if (!fs.existsSync(GENERATED_CLIENT_DIR)) {
    throw new Error(`Generated Prisma client directory not found: ${GENERATED_CLIENT_DIR}`);
  }

  if (!fs.existsSync(PRISMA_CLIENT_PACKAGE_DIR)) {
    throw new Error(`Prisma client package directory not found: ${PRISMA_CLIENT_PACKAGE_DIR}`);
  }

  const relativeGeneratedClient = '../../../src/generated/prisma';
  const relativeGeneratedIndex = '../../../src/generated/prisma/index.js';
  const relativeGeneratedDefault = '../../../src/generated/prisma/default.js';
  const packageFiles = [
    ['index.js', `module.exports = { ...require('${relativeGeneratedIndex}') }\n`],
    ['default.js', `module.exports = { ...require('${relativeGeneratedDefault}') }\n`],
    ['index.d.ts', `export * from '${relativeGeneratedClient}/index'\n`],
    ['default.d.ts', `export * from '${relativeGeneratedClient}/index'\n`],
  ];

  for (const [fileName, contents] of packageFiles) {
    fs.writeFileSync(path.join(PRISMA_CLIENT_PACKAGE_DIR, fileName), contents, 'utf8');
  }
}

async function main() {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    cleanupTemporaryClientFiles();

    const result = spawnSync(process.execPath, [PRISMA_ENTRY, ...PRISMA_ARGS], {
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
      encoding: 'utf8',
    });

    writeResultOutput(result);

    if (result.status === 0) {
      patchPrismaClientPackage();
      process.exit(0);
    }

    if (attempt < MAX_ATTEMPTS && isWindowsRenameLockIssue(result)) {
      console.warn(
        `Prisma generate hit a Windows file-lock error. Retrying in ${RETRY_DELAY_MS}ms (${attempt}/${MAX_ATTEMPTS})...`,
      );
      await sleep(RETRY_DELAY_MS * attempt);
      continue;
    }

    process.exit(result.status ?? 1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
