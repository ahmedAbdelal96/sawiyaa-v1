import { registerAs } from '@nestjs/config';

const LOG_LEVELS = [
  'error',
  'warn',
  'info',
  'http',
  'debug',
  'verbose',
] as const;
type LogLevel = (typeof LOG_LEVELS)[number];

function isLogLevel(value: string | undefined): value is LogLevel {
  return Boolean(value && LOG_LEVELS.includes(value as LogLevel));
}

function toBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (!value) return defaultValue;
  return value.toLowerCase() === 'true';
}

function toPositiveInteger(
  value: string | undefined,
  defaultValue: number,
): number {
  const parsed = value ? Number(value) : Number.NaN;
  return Number.isInteger(parsed) && parsed > 0 ? parsed : defaultValue;
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
  const slowRequestMs = toPositiveInteger(
    process.env.LOG_SLOW_REQUEST_MS,
    1000,
  );
  const retentionDays = toPositiveInteger(process.env.LOG_RETENTION_DAYS, 30);
  const maxFileSize = process.env.LOG_MAX_FILE_SIZE?.trim() || '20m';

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
  };
});
