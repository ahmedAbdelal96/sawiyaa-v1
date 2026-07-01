import { sanitizeForLogging } from './log-sanitizer.util';
import type { LogRecord } from './logging.types';
import { resolveServiceName } from './service-name.util';

const BASE_IGNORED_KEYS = new Set([
  'timestamp',
  'level',
  'message',
  'context',
  'targets',
  'fileEnabled',
  'stackEnabled',
  'appName',
  'environment',
  'serviceName',
  'service',
  'env',
]);

export function toJsonLogRecord(
  info: LogRecord,
  defaults?: { service?: string; env?: string },
): Record<string, unknown> {
  const service = info.service ?? info.appName ?? defaults?.service ?? resolveServiceName();
  const env = info.env ?? info.environment ?? defaults?.env ?? process.env.NODE_ENV ?? 'development';

  const extras = Object.entries(info).reduce<Record<string, unknown>>(
    (accumulator, [key, value]) => {
      if (BASE_IGNORED_KEYS.has(key)) {
        return accumulator;
      }

      accumulator[key] = value;
      return accumulator;
    },
    {},
  );

  return sanitizeForLogging({
    timestamp: info.timestamp ?? new Date().toISOString(),
    level: info.level ?? 'info',
    service,
    env,
    context: info.context ?? null,
    message:
      typeof info.message === 'string'
        ? info.message
        : info.message === undefined
          ? ''
          : String(info.message),
    ...extras,
  });
}

export function formatConsoleMeta(meta: Record<string, unknown>): string {
  const orderedKeys = [
    'requestId',
    'method',
    'path',
    'statusCode',
    'durationMs',
    'port',
    'apiPrefix',
    'pid',
    'routeController',
    'routeHandler',
    'userId',
    'role',
    'locale',
    'errorName',
    'errorMessage',
    'service',
    'env',
  ];

  const rendered = orderedKeys
    .flatMap((key) => {
      const value = meta[key];
      if (value === undefined || value === null || value === '') {
        return [];
      }

      if (Array.isArray(value)) {
        return [`${key}=[${value.map((item) => String(item)).join(', ')}]`];
      }

      if (typeof value === 'object') {
        return [];
      }

      return [`${key}=${String(value)}`];
    })
    .join(' ');

  return rendered.length > 0 ? ` ${rendered}` : '';
}
