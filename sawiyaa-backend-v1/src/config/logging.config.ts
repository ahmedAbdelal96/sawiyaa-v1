import { registerAs } from '@nestjs/config';
import { resolveServiceName } from '@common/logging/service-name.util';

const LOG_LEVELS = ['error', 'warn', 'info', 'debug', 'verbose'] as const;
type LogLevel = (typeof LOG_LEVELS)[number];

function isLogLevel(value: string | undefined): value is LogLevel {
  return Boolean(value && LOG_LEVELS.includes(value as LogLevel));
}

function toBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (!value) return defaultValue;
  return value.toLowerCase() === 'true';
}

function toNonNegativeInteger(
  value: string | undefined,
  defaultValue: number,
): number {
  const parsed = value ? Number(value) : Number.NaN;
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : defaultValue;
}

export function parseLogFileSize(
  value: string | undefined,
  defaultValue = 20 * 1024 * 1024,
): number {
  if (!value?.trim()) return defaultValue;
  const match = /^(\d+(?:\.\d+)?)\s*(b|kb|mb|gb)?$/i.exec(value.trim());
  if (!match) return defaultValue;
  const multiplier =
    { b: 1, kb: 1024, mb: 1024 ** 2, gb: 1024 ** 3 }[
      match[2]?.toLowerCase() ?? 'b'
    ] ?? 1;
  const bytes = Number(match[1]) * multiplier;
  return Number.isFinite(bytes) && bytes > 0 ? Math.floor(bytes) : defaultValue;
}

export default registerAs('logging', () => {
  const nodeEnv = process.env.NODE_ENV ?? 'development';
  const isProduction = nodeEnv === 'production';

  const level = isLogLevel(process.env.LOG_LEVEL)
    ? process.env.LOG_LEVEL
    : isProduction
      ? 'info'
      : 'debug';

  const pretty = toBoolean(process.env.LOG_PRETTY, !isProduction);
  const httpEnabled = toBoolean(process.env.LOG_HTTP_ENABLED, true);
  const fileEnabled = toBoolean(process.env.LOG_FILE_ENABLED, true);
  const consoleEnabled = toBoolean(process.env.LOG_CONSOLE_ENABLED, true);
  const stackEnabled =
    process.env.LOG_STACK_ENABLED !== undefined
      ? toBoolean(process.env.LOG_STACK_ENABLED, !isProduction)
      : !isProduction;
  const nestInternalEnabled = toBoolean(
    process.env.LOG_NEST_INTERNAL_ENABLED,
    false,
  );
  const logDir = process.env.LOG_DIR?.trim() || 'logs';
  const slowRequestMs = toNonNegativeInteger(
    process.env.LOG_SLOW_REQUEST_MS,
    1000,
  );
  const retentionDays = toNonNegativeInteger(
    process.env.LOG_RETENTION_DAYS,
    30,
  );
  const maxFileSize = process.env.LOG_MAX_FILE_SIZE?.trim() || '20m';
  const maxFileSizeBytes = parseLogFileSize(maxFileSize);
  const serviceName = resolveServiceName();
  const version =
    process.env.APP_VERSION?.trim() ||
    process.env.npm_package_version?.trim() ||
    '0.0.1';
  const deploymentId = process.env.DEPLOYMENT_ID?.trim() || null;

  return {
    nodeEnv,
    level,
    pretty,
    httpEnabled,
    fileEnabled,
    consoleEnabled,
    stackEnabled,
    nestInternalEnabled,
    logDir,
    slowRequestMs,
    retentionDays,
    maxFileSize,
    maxFileSizeBytes,
    serviceName,
    version,
    deploymentId,
  };
});
