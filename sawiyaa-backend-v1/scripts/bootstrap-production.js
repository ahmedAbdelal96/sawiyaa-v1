'use strict';

const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
require('dotenv/config');

const INITIAL_ADMIN_STATE_FILE = '/tmp/sawiyaa-production-initial-admin-email';

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
  const stateFile = env.PRODUCTION_INITIAL_ADMIN_STATE_FILE || INITIAL_ADMIN_STATE_FILE;
  const bootstrapEnv = { ...env, PRODUCTION_INITIAL_ADMIN_STATE_FILE: stateFile };
  try { fs.rmSync(stateFile, { force: true }); } catch {}

  runScript('config:validate:production', bootstrapEnv);
  runScript('prisma:migrate:deploy', bootstrapEnv);
  runScript('db:seed:production', bootstrapEnv);
  // The command remains one-shot: the child bootstrap prompts securely when
  // no automation variables are supplied, and exits without a password prompt
  // when the intended Super Admin is already configured.
  runScript('db:bootstrap:initial-admin', bootstrapEnv);
  if (bootstrapEnv.ALLOW_PAYMENT_ROUTE_BOOTSTRAP === 'true') {
    runScript('db:bootstrap:payment-routes', bootstrapEnv);
  }
  if (bootstrapEnv.ALLOW_PAYMOB_CONTROL_BOOTSTRAP === 'true') {
    runScript('db:bootstrap:paymob-provider-control', bootstrapEnv);
  }
  const verifyEnv = { ...bootstrapEnv };
  try {
    const selectedEmail = fs.readFileSync(stateFile, 'utf8').trim();
    if (selectedEmail && !verifyEnv.PRODUCTION_INITIAL_ADMIN_EMAIL) {
      verifyEnv.PRODUCTION_INITIAL_ADMIN_EMAIL = selectedEmail;
    }
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }
  try {
    runScript('db:verify:production-ready', verifyEnv);
    console.log('PRODUCTION_BOOTSTRAP_COMPLETE');
  } finally {
    try { fs.rmSync(stateFile, { force: true }); } catch {}
  }
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
