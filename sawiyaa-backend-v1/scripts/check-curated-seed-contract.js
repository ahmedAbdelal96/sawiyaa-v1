const { spawnSync } = require('node:child_process');
const path = require('node:path');

const modules = [
  'users',
  'auth',
  'reference-data',
  'specialties',
  'assessments',
  'patients',
  'practitioners',
  'package-plans',
  'help',
  'refund-policies',
  'admin',
  'notifications',
  'config',
  'financial-rules',
  'session-access',
  'articles',
  'curated-dev',
].map((name) => `prisma/seed/modules/${name}.seed.ts`);

const result = spawnSync(
  process.execPath,
  [
    path.join(process.cwd(), 'node_modules/typescript/bin/tsc'),
    '--noEmit',
    '--target',
    'ES2023',
    '--module',
    'commonjs',
    '--moduleResolution',
    'node',
    '--esModuleInterop',
    '--skipLibCheck',
    '--strictNullChecks',
    'false',
    'prisma/seed.ts',
    ...modules,
  ],
  { stdio: 'inherit' },
);

process.exit(result.status ?? 1);
