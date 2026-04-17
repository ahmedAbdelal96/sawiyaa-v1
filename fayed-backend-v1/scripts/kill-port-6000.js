const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const DEFAULT_PORT = 6001;

function resolvePort() {
  const envPort = process.env.PORT;
  if (envPort && /^\d+$/.test(envPort)) {
    return Number(envPort);
  }

  // Prestart scripts run before Nest ConfigModule, so we read .env directly.
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    const match = content.match(/^\s*PORT\s*=\s*(\d+)\s*$/m);
    if (match) {
      return Number(match[1]);
    }
  }

  return DEFAULT_PORT;
}

const PORT = resolvePort();
const LEGACY_PORT = 6000;

/**
 * Development runs can leave an old process attached to the configured HTTP port.
 * This script clears that port before Nest starts so watch-mode restarts do not fail on EADDRINUSE.
 */
function getPidsUsingPort(port) {
  try {
    if (process.platform === 'win32') {
      const output = execSync(`netstat -ano -p tcp | findstr :${port}`, {
        stdio: ['ignore', 'pipe', 'ignore'],
        encoding: 'utf8',
      });

      return output
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => line.split(/\s+/).pop())
        .filter(Boolean)
        .filter((pid) => pid !== String(process.pid));
    }

    const output = execSync(`lsof -ti tcp:${port}`, {
      stdio: ['ignore', 'pipe', 'ignore'],
      encoding: 'utf8',
    });

    return output
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .filter((pid) => pid !== String(process.pid));
  } catch {
    return [];
  }
}

function killPid(pid) {
  try {
    if (process.platform === 'win32') {
      execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' });
      return;
    }

    process.kill(Number(pid), 'SIGKILL');
  } catch {
    // Ignore kill failures so startup can continue when a process exits between lookup and kill.
  }
}

const portsToClean = [...new Set([PORT, LEGACY_PORT])];
const uniquePids = [
  ...new Set(portsToClean.flatMap((port) => getPidsUsingPort(port))),
];

for (const pid of uniquePids) {
  killPid(pid);
}
