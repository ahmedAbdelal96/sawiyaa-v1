import { registerAs } from '@nestjs/config';

const LOG_LEVELS = ['error', 'warn', 'info', 'http', 'debug', 'verbose'] as const;
type LogLevel = (typeof LOG_LEVELS)[number];

function isLogLevel(value: string | undefined): value is LogLevel {
  return Boolean(value && LOG_LEVELS.includes(value as LogLevel));
}

function toBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (!value) return defaultValue;
  return value.toLowerCase() === 'true';
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

  return {
    nodeEnv,
    level,
    pretty,
    httpEnabled,
  };
});
