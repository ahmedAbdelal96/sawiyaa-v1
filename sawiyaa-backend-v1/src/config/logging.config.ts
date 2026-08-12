import { registerAs } from '@nestjs/config';
import { resolveServiceName } from '@common/logging/service-name.util';
import {
  DEFAULT_LOG_MAX_FILE_SIZE,
  parseLogFileSize,
} from './log-file-size';

export { parseLogFileSize } from './log-file-size';

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
  const maxFileSize =
    process.env.LOG_MAX_FILE_SIZE?.trim() || DEFAULT_LOG_MAX_FILE_SIZE;
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
