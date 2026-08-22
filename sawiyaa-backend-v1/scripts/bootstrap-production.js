'use strict';

const { spawnSync } = require('node:child_process');

function assertProductionBootstrapEnvironment(env) {
  const appEnv = String(env.APP_ENV || env.NODE_ENV || '').toLowerCase();
  if (!['production', 'staging'].includes(appEnv)) {
    throw new Error('Refusing production bootstrap outside production or staging.');
  }
  if (env.ALLOW_PRODUCTION_BASELINE_SEED !== 'true') {
    throw new Error(
      'Refusing production bootstrap. Set ALLOW_PRODUCTION_BASELINE_SEED=true for an explicit operator run.',
    );
  }
  const databaseUrl = String(env.DATABASE_URL || '').toLowerCase();
  if (!databaseUrl) throw new Error('Refusing production bootstrap: DATABASE_URL is required.');
  if (/localhost|127\.0\.0\.1|0\.0\.0\.0|::1/.test(databaseUrl)) {
    throw new Error('Refusing production bootstrap against a local database.');
  }
}

function runNpmScript(script, env) {
  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const result = spawnSync(npm, ['run', script], { env, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`Production bootstrap stopped after npm run ${script}.`);
  }
}

function main() {
  assertProductionBootstrapEnvironment(process.env);
  console.log('PRODUCTION_BOOTSTRAP_ENVIRONMENT_VALID');
  runNpmScript('config:validate:production', process.env);
  runNpmScript('prisma:migrate:deploy', process.env);
  runNpmScript('db:seed:production', process.env);
  runNpmScript('db:verify:production-ready', process.env);
  console.log('PRODUCTION_BOOTSTRAP_COMPLETE');
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : 'Production bootstrap failed.'}\n`);
    process.exitCode = 1;
  }
}

module.exports = { assertProductionBootstrapEnvironment };
