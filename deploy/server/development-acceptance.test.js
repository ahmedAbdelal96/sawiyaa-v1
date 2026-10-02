const assert = require('node:assert/strict');
const childProcess = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '../..');
const bash = process.platform === 'win32' ? 'C:\\Program Files\\Git\\bin\\bash.exe' : 'bash';

function run(command, args, options = {}) {
  return childProcess.spawnSync(command, args, {
    cwd: options.cwd || root,
    encoding: 'utf8',
    env: { ...process.env, ...(options.env || {}) },
    timeout: options.timeout || 20 * 60 * 1000,
    maxBuffer: 32 * 1024 * 1024,
  });
}

function acceptanceBackendEnv(source) {
  const overrides = {
    APP_ENV: 'development',
    NODE_ENV: 'development',
    APP_VERSION: 'acceptance',
    DEPLOYMENT_ID: 'acceptance',
    PORT: '7000',
    APP_URL: 'http://acceptance.sawiyaa.test:18080',
    WEB_APP_URL: 'http://acceptance.sawiyaa.test:18080',
    APP_BASE_URL: 'http://acceptance.sawiyaa.test:18080',
    CORS_ORIGINS: 'http://acceptance.sawiyaa.test:18080',
    DATABASE_URL: 'postgresql://sawiyaa_dev:accept-password@postgres:5432/sawiyaa_dev',
    POSTGRES_DB: 'sawiyaa_dev',
    POSTGRES_USER: 'sawiyaa_dev',
    POSTGRES_PASSWORD: 'accept-password',
    JWT_ACCESS_SECRET: 'accept-access-secret-012345678901234567890',
    JWT_REFRESH_SECRET: 'accept-refresh-secret-012345678901234567890',
    DAILY_API_KEY: 'accept-daily-api-key',
    DAILY_WEBHOOK_SECRET: 'accept-daily-webhook-secret',
    CORPORATE_CODE_PEPPER: 'accept-corporate-pepper-012345678901234567890',
    MAIL_PROVIDER: 'smtp',
    MAIL_FROM: 'accept@sawiyaa.test',
    MAIL_HOST: 'mailpit',
    MAIL_PORT: '1025',
    MAIL_USER: 'accept-user',
    MAIL_PASS: 'accept-password',
    GEOIP_ENABLED: 'false',
    GEOIP_DATABASE_PATH: '',
    SAWIYAA_DEV_COUNTRY_CODE: 'EG',
    NOTIFICATION_QUEUE_ENABLED: 'false',
    DAILY_ATTENDANCE_QUEUE_ENABLED: 'false',
    PAYMENT_SUCCESS_URL: 'http://localhost:18080/payment/success',
    PAYMENT_FAILED_URL: 'http://localhost:18080/payment/failed',
    PAYMENT_PENDING_URL: 'http://localhost:18080/payment/pending',
  };
  return source.split(/\r?\n/).map((line) => {
    const match = line.match(/^([A-Z][A-Z0-9_]*)=(.*)$/);
    if (!match) return line;
    const [, name, value] = match;
    if (Object.prototype.hasOwnProperty.call(overrides, name))
      return `${name}=${overrides[name]}`;
    if (/^<.*>$/.test(value)) return `${name}=accept-${name.toLowerCase()}`;
    return line;
  }).join('\n');
}

function acceptanceFrontendEnv(source) {
  const overrides = {
    NEXT_PUBLIC_API_URL: '/api/v1',
    API_PROXY_TARGET: 'http://backend:7000',
    NEXT_PUBLIC_APP_NAME: 'Sawiyaa Acceptance',
    NEXT_PUBLIC_APP_URL: 'http://acceptance.sawiyaa.test:18080',
    NEXT_PUBLIC_SITE_URL: 'http://acceptance.sawiyaa.test:18080',
    NEXT_PUBLIC_APP_ENV: 'development',
    NEXT_PUBLIC_CHAT_SOCKET_URL: 'http://acceptance.sawiyaa.test:18080',
  };
  return source.split(/\r?\n/).map((line) => {
    const match = line.match(/^([A-Z][A-Z0-9_]*)=(.*)$/);
    if (!match) return line;
    const [, name] = match;
    return Object.prototype.hasOwnProperty.call(overrides, name)
      ? `${name}=${overrides[name]}`
      : line;
  }).join('\n');
}

test('full Linux/Docker development deployment acceptance', { timeout: 30 * 60 * 1000 }, (t) => {
  const dockerVersion = run('docker', ['version', '--format', '{{.Server.Version}}'], { timeout: 30_000 });
  if (dockerVersion.status !== 0) {
    t.skip('Docker daemon is unavailable; run this acceptance test on Linux with Docker enabled.');
    return;
  }

  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'sawiyaa-dev-acceptance-'));
  const projectName = `sawiyaa-dev-acceptance-${process.pid}`.toLowerCase();
  const httpPort = String(18080 + (process.pid % 100));
  let cleanup = () => {};
  try {
    const clone = run('git', ['clone', '--local', '--branch', 'development', root, tempRoot], { timeout: 120_000 });
    assert.equal(clone.status, 0, clone.stderr);
    const backendExample = fs.readFileSync(path.join(tempRoot, 'sawiyaa-backend-v1/.env.example'), 'utf8');
    const frontendExample = fs.readFileSync(path.join(tempRoot, 'sawiyaa-frontend-v1/.env.example'), 'utf8');
    fs.writeFileSync(path.join(tempRoot, 'sawiyaa-backend-v1/.env'), acceptanceBackendEnv(backendExample), { mode: 0o600 });
    fs.writeFileSync(path.join(tempRoot, 'sawiyaa-frontend-v1/.env'), acceptanceFrontendEnv(frontendExample), { mode: 0o600 });

    cleanup = () => {
      const args = ['compose', '--env-file', 'sawiyaa-backend-v1/.env', '--env-file', 'sawiyaa-frontend-v1/.env', '-p', projectName, '-f', 'docker-compose.dev.yml', 'down', '--remove-orphans'];
      run('docker', args, { cwd: tempRoot, timeout: 120_000 });
      const volumes = run('docker', ['volume', 'ls', '--filter', `label=com.docker.compose.project=${projectName}`, '-q'], { timeout: 30_000 });
      if (volumes.status === 0 && volumes.stdout.trim())
        run('docker', ['volume', 'rm', ...volumes.stdout.trim().split(/\r?\n/)], { timeout: 60_000 });
      fs.rmSync(tempRoot, { recursive: true, force: true });
    };

    const update = run(bash, [path.join(tempRoot, 'deploy/server/update-dev.sh')], {
      cwd: tempRoot,
      timeout: 30 * 60 * 1000,
      env: {
        SAWIYAA_TEST_MODE: 'true',
        SAWIYAA_DEV_PROJECT_DIR: tempRoot,
        SAWIYAA_DEV_COMPOSE_PROJECT_NAME: projectName,
        SAWIYAA_DEV_HTTP_PORT: httpPort,
        SAWIYAA_FORCE_DOCKER_VALIDATOR: 'true',
      },
    });
    assert.equal(update.status, 0, `${update.stdout}\n${update.stderr}`);
    assert.match(update.stdout, /Development update: COMPLETE/);

    const services = run('docker', ['compose', '--env-file', 'sawiyaa-backend-v1/.env', '--env-file', 'sawiyaa-frontend-v1/.env', '-p', projectName, '-f', 'docker-compose.dev.yml', 'ps', '--status', 'running', '--services'], { cwd: tempRoot });
    assert.equal(services.status, 0, services.stderr);
    for (const service of ['postgres', 'backend', 'frontend', 'nginx']) assert.match(services.stdout, new RegExp(`^${service}$`, 'm'));
    assert.equal(run('curl', ['-fsS', `http://127.0.0.1:${httpPort}/api/v1/health`]).status, 0);
    assert.equal(run('curl', ['-fsS', `http://127.0.0.1:${httpPort}/`]).status, 0);
    assert.equal(run('docker', ['volume', 'ls', '--filter', `label=com.docker.compose.project=${projectName}`, '-q']).status, 0);
  } finally {
    cleanup();
  }
});
