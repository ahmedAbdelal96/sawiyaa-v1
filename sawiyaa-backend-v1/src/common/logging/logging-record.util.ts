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
  const service =
    info.service ?? info.appName ?? defaults?.service ?? resolveServiceName();
  const env =
    info.env ??
    info.environment ??
    defaults?.env ??
    process.env.NODE_ENV ??
    'development';

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
  const scalar = (value: unknown): string =>
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
      ? String(value)
      : '';
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
        return [`${key}=[${value.map(scalar).join(', ')}]`];
      }

      if (typeof value === 'object') {
        return [];
      }

      return [`${key}=${scalar(value)}`];
    })
    .join(' ');

  return rendered.length > 0 ? ` ${rendered}` : '';
}

export type HttpConsoleStyle =
  | 'success'
  | 'redirect'
  | 'warning'
  | 'rate-limit'
  | 'error'
  | 'slow-success';

export function httpConsoleStyle(
  statusCode: number,
  isSlow = false,
): HttpConsoleStyle {
  if (statusCode >= 500) return 'error';
  if (statusCode === 429) return 'rate-limit';
  if (statusCode >= 400) return 'warning';
  if (isSlow) return 'slow-success';
  if (statusCode >= 300) return 'redirect';
  return 'success';
}

export function formatHttpConsoleSummary(
  meta: Record<string, unknown>,
  colorsEnabled: boolean,
): string {
  if (typeof meta.statusCode !== 'number') return '';
  const scalar = (value: unknown, fallback: string): string =>
    typeof value === 'string' || typeof value === 'number'
      ? String(value)
      : fallback;
  const status = scalar(meta.statusCode, '0').padStart(3, ' ');
  const method = scalar(meta.method, '').padEnd(6, ' ');
  const route = scalar(meta.route ?? meta.path, '').padEnd(48, ' ');
  const duration = `${scalar(meta.durationMs, '0')}ms`;
  const requestId = scalar(meta.requestId, '-');
  const errorCode = meta.errorCode ? ` ${scalar(meta.errorCode, '')}` : '';
  const line = `${status} ${method} ${route} ${duration} ${requestId}${errorCode}`;
  if (!colorsEnabled) return line;
  const colors: Record<HttpConsoleStyle, string> = {
    success: '\u001b[32m',
    redirect: '\u001b[36m',
    warning: '\u001b[33m',
    'rate-limit': '\u001b[35m',
    error: '\u001b[31m',
    'slow-success': '\u001b[1;33m',
  };
  return `${colors[httpConsoleStyle(meta.statusCode, meta.isSlow === true)]}${line}\u001b[0m`;
}
