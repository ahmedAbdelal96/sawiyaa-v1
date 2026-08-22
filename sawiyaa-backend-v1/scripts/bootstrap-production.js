'use strict';

const { spawnSync } = require('node:child_process');
require('dotenv/config');

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
  const localDatabase = /localhost|127\.0\.0\.1|0\.0\.0\.0|::1/.test(databaseUrl);
  const disposableLocalRun =
    env.ALLOW_DISPOSABLE_PRODUCTION_BOOTSTRAP === 'true' && appEnv === 'staging';
  if (localDatabase && !disposableLocalRun) {
    throw new Error('Refusing production bootstrap against a local database.');
  }
}

function runNpmScript(script, env) {
  const command = `npm run ${script}`;
  const result = process.platform === 'win32'
    ? spawnSync(env.ComSpec || process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', command], {
        env,
        stdio: 'inherit',
      })
    : spawnSync('npm', ['run', script], { env, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`Production bootstrap stopped after npm run ${script}.`);
  }
}

function runProductionBootstrap(env, runScript = runNpmScript) {
  assertProductionBootstrapEnvironment(env);
  console.log('PRODUCTION_BOOTSTRAP_ENVIRONMENT_VALID');
  runScript('config:validate:production', env);
  runScript('prisma:migrate:deploy', env);
  runScript('db:seed:production', env);
  if (env.ALLOW_PAYMENT_ROUTE_BOOTSTRAP === 'true') {
    runScript('db:bootstrap:payment-routes', env);
  }
  if (env.ALLOW_PAYMOB_CONTROL_BOOTSTRAP === 'true') {
    runScript('db:bootstrap:paymob-provider-control', env);
  }
  runScript('db:verify:production-ready', env);
  console.log('PRODUCTION_BOOTSTRAP_COMPLETE');
}

if (require.main === module) {
  try {
    runProductionBootstrap(process.env);
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : 'Production bootstrap failed.'}\n`);
    process.exitCode = 1;
  }
}

module.exports = { assertProductionBootstrapEnvironment, runProductionBootstrap };
