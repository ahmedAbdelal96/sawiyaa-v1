'use strict';

const assert = require('node:assert/strict');
const childProcess = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const repoRoot = path.resolve(__dirname, '..', '..');
const bash = process.platform === 'win32'
  ? 'C:\\Program Files\\Git\\bin\\bash.exe'
  : 'bash';
const bashAvailable = process.platform !== 'win32' || fs.existsSync(bash);

function tempDirectory(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function writeEnv(root, relative, values) {
  const file = path.join(root, relative);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(
    file,
    Object.entries(values).map(([name, value]) => `${name}=${value}`).join('\n') + '\n',
    { mode: 0o600 },
  );
  return file;
}

function canonicalFiles(root) {
  return {
    backend: writeEnv(root, 'sawiyaa-backend-v1/.env', {
      APP_ENV: 'production',
      NODE_ENV: 'production',
      APP_URL: 'https://sawiyaa.test',
      WEB_APP_URL: 'https://sawiyaa.test',
      LOG_LEVEL: 'info',
      DATABASE_URL: 'postgresql://user:password@postgres:5432/app',
      JWT_ACCESS_SECRET: 'a'.repeat(32),
      JWT_REFRESH_SECRET: 'b'.repeat(32),
      GEOIP_ENABLED: 'false',
      MAIL_PROVIDER: 'smtp',
      MAIL_FROM: 'noreply@sawiyaa.test',
      MAIL_HOST: 'smtp.sawiyaa.test',
      MAIL_USER: 'smtp-user',
      MAIL_PASS: 'smtp-password',
      DAILY_API_KEY: 'daily-key',
      DAILY_API_BASE_URL: 'https://api.daily.co/v1',
      DAILY_WEBHOOK_SECRET: 'daily-webhook-secret',
      CORPORATE_CODE_PEPPER: 'c'.repeat(32),
    }),
    postgres: writeEnv(root, 'sawiyaa-backend-v1/.env.postgres', {
      POSTGRES_DB: 'app',
      POSTGRES_USER: 'user',
      POSTGRES_PASSWORD: 'postgres-password',
    }),
    frontend: writeEnv(root, 'sawiyaa-frontend-v1/.env', {
      NEXT_PUBLIC_API_URL: '/api/v1',
      NEXT_PUBLIC_APP_URL: 'https://sawiyaa.test',
      API_PROXY_TARGET: 'http://backend:7000',
    }),
  };
}

function runBash(script, args, env = {}) {
  return childProcess.spawnSync(bash, [script, ...args], {
    encoding: 'utf8',
    env: { ...process.env, ...env },
  });
}

test('detached release stages canonical env files and cleanup removes only the temporary copies', {
  skip: !bashAvailable,
}, () => {
  const sourceRoot = tempDirectory('sawiyaa-canonical-env-');
  const releaseRoot = tempDirectory('sawiyaa-detached-release-');
  try {
    const files = canonicalFiles(sourceRoot);
    const helper = path.join(repoRoot, 'deploy', 'scripts', 'stage-release-env.sh');
    const before = Object.fromEntries(
      Object.entries(files).map(([name, file]) => [name, fs.readFileSync(file)]),
    );

    assert.equal(fs.existsSync(path.join(releaseRoot, 'sawiyaa-backend-v1/.env')), false);
    assert.equal(fs.existsSync(path.join(releaseRoot, 'sawiyaa-backend-v1/.env.postgres')), false);
    assert.equal(fs.existsSync(path.join(releaseRoot, 'sawiyaa-frontend-v1/.env')), false);

    const staged = runBash(helper, [sourceRoot, releaseRoot]);
    assert.equal(staged.status, 0, `${staged.stdout}\n${staged.stderr}`);

    for (const [name, source] of Object.entries(files)) {
      const relative = name === 'backend'
        ? 'sawiyaa-backend-v1/.env'
        : name === 'postgres'
          ? 'sawiyaa-backend-v1/.env.postgres'
          : 'sawiyaa-frontend-v1/.env';
      const target = path.join(releaseRoot, relative);
      assert.deepEqual(fs.readFileSync(target), before[name]);
      if (process.platform !== 'win32')
        assert.equal(fs.statSync(target).mode & 0o777, 0o600);
      assert.deepEqual(fs.readFileSync(source), before[name]);
    }

    fs.rmSync(releaseRoot, { recursive: true, force: true });
    assert.equal(fs.existsSync(releaseRoot), false);
    for (const file of Object.values(files)) assert.deepEqual(fs.readFileSync(file), before[Object.keys(files).find((name) => files[name] === file)]);
  } finally {
    fs.rmSync(sourceRoot, { recursive: true, force: true });
    fs.rmSync(releaseRoot, { recursive: true, force: true });
  }
});

test('Docker Compose config succeeds after detached env staging when Docker Compose is available', {
  skip: !bashAvailable || childProcess.spawnSync('docker', ['compose', 'version']).status !== 0,
}, () => {
  const sourceRoot = tempDirectory('sawiyaa-compose-source-');
  const releaseRoot = tempDirectory('sawiyaa-compose-release-');
  try {
    const files = canonicalFiles(sourceRoot);
    fs.copyFileSync(path.join(repoRoot, 'docker-compose.prod.yml'), path.join(releaseRoot, 'docker-compose.prod.yml'));
    const helper = path.join(repoRoot, 'deploy', 'scripts', 'stage-release-env.sh');
    const staged = runBash(helper, [sourceRoot, releaseRoot]);
    assert.equal(staged.status, 0, `${staged.stdout}\n${staged.stderr}`);
    const config = childProcess.spawnSync(
      'docker',
      ['compose', '--env-file', path.join(releaseRoot, 'sawiyaa-frontend-v1/.env'), '-f', path.join(releaseRoot, 'docker-compose.prod.yml'), 'config'],
      { encoding: 'utf8' },
    );
    assert.equal(config.status, 0, `${config.stdout}\n${config.stderr}`);
    assert.deepEqual(fs.readFileSync(files.backend), fs.readFileSync(path.join(sourceRoot, 'sawiyaa-backend-v1/.env')));
  } finally {
    fs.rmSync(sourceRoot, { recursive: true, force: true });
    fs.rmSync(releaseRoot, { recursive: true, force: true });
  }
});

test('Compose model failure reports sanitized diagnostics and skips PostgreSQL checks', {
  skip: !bashAvailable,
}, () => {
  const root = tempDirectory('sawiyaa-preflight-fixture-');
  const sourceRoot = tempDirectory('sawiyaa-preflight-env-');
  try {
    const files = canonicalFiles(sourceRoot);
    fs.mkdirSync(path.join(root, 'deploy/scripts'), { recursive: true });
    fs.mkdirSync(path.join(root, 'deploy/config'), { recursive: true });
    fs.copyFileSync(path.join(repoRoot, 'deploy/scripts/validate-production-preflight.sh'), path.join(root, 'deploy/scripts/validate-production-preflight.sh'));
    fs.copyFileSync(path.join(repoRoot, 'deploy/scripts/validate-environment-contract.js'), path.join(root, 'deploy/scripts/validate-environment-contract.js'));
    fs.copyFileSync(path.join(repoRoot, 'deploy/config/environment-contract.yaml'), path.join(root, 'deploy/config/environment-contract.yaml'));
    fs.copyFileSync(path.join(repoRoot, 'deploy/scripts/backup-db.sh'), path.join(root, 'deploy/scripts/backup-db.sh'));
    fs.cpSync(path.join(repoRoot, 'sawiyaa-backend-v1/src/config'), path.join(root, 'sawiyaa-backend-v1/src/config'), { recursive: true });
    fs.cpSync(path.join(repoRoot, 'sawiyaa-frontend-v1/src'), path.join(root, 'sawiyaa-frontend-v1/src'), { recursive: true });
    fs.copyFileSync(path.join(repoRoot, 'sawiyaa-frontend-v1/next.config.ts'), path.join(root, 'sawiyaa-frontend-v1/next.config.ts'));
    fs.writeFileSync(path.join(root, 'docker-compose.prod.yml'), 'services: {}\n');
    childProcess.execFileSync('git', ['init', '-q', root]);
    childProcess.execFileSync('git', ['-C', root, 'add', '.']);
    childProcess.execFileSync('git', ['-C', root, '-c', 'user.email=fixture@example.test', '-c', 'user.name=fixture', 'commit', '-qm', 'fixture']);
    const bin = path.join(root, 'bin');
    fs.mkdirSync(bin);
    const calls = path.join(root, 'docker-calls.log');
    const fakeDocker = path.join(bin, 'docker');
    const nodeExecutable = process.execPath.replaceAll('\\', '/');
    fs.writeFileSync(fakeDocker, `#!/usr/bin/env bash
node_executable="${nodeExecutable}"
echo "$*" >> "${calls.replaceAll('\\\\', '/')}"
if [[ "$1" == "info" ]]; then exit 0; fi
if [[ "$1" == "compose" && "$2" == "version" ]]; then exit 0; fi
if [[ "$1" == "compose" && "$*" == *" config "* ]]; then echo 'env file ZOOM_CLIENT_SECRET=super-secret must exist' >&2; exit 1; fi
if [[ "$1" == "run" ]]; then
  workspace=""; backend_env=""; frontend_env=""; db_env=""
  while [[ $# -gt 0 ]]; do
    if [[ "$1" == "-v" ]]; then
      mount="$2"
      case "$mount" in
        *:/workspace:ro) workspace="\${mount%:/workspace:ro}" ;;
        *:/inputs/backend.env:ro) backend_env="\${mount%:/inputs/backend.env:ro}" ;;
        *:/inputs/frontend.env:ro) frontend_env="\${mount%:/inputs/frontend.env:ro}" ;;
        *:/inputs/db.env:ro) db_env="\${mount%:/inputs/db.env:ro}" ;;
      esac
      shift 2
    else
      shift
    fi
  done
  "$node_executable" "$workspace/deploy/scripts/validate-environment-contract.js" --backend-env "$backend_env" --frontend-env "$frontend_env" --db-env "$db_env" --environment production
  exit $?
fi
echo 'unexpected docker readiness call' >&2; exit 99
`);
    fs.chmodSync(fakeDocker, 0o755);
    const shellPath = process.platform === 'win32'
      ? process.env.PATH.replaceAll(';', ':')
      : process.env.PATH;
    const run = runBash(
      path.join(root, 'deploy/scripts/validate-production-preflight.sh'),
      ['--project-dir', root, '--backend-env', files.backend, '--frontend-env', files.frontend, '--db-env', files.postgres, '--target-only', '--skip-lock', '--min-free-mb', '1'],
      { PATH: `${bin}:${shellPath}` },
    );
    const output = `${run.stdout}\n${run.stderr}`;
    assert.notEqual(run.status, 0);
    assert.match(output, /BLOCKING COMPOSE_MODEL_INVALID/);
    assert.match(output, /SANITIZED_COMPOSE_CONFIG_ERROR_BEGIN/);
    assert.match(output, /SKIPPED POSTGRES_CHECK_COMPOSE_MODEL_INVALID/);
    assert.doesNotMatch(output, /BLOCKING POSTGRES_CONTAINER_UNAVAILABLE|BLOCKING POSTGRES_UNHEALTHY/);
    assert.doesNotMatch(fs.readFileSync(calls, 'utf8'), /\bps\b|\bexec\b/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
    fs.rmSync(sourceRoot, { recursive: true, force: true });
  }
});
