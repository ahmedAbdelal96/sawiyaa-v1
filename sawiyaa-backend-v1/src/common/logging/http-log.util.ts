import { HttpException } from '@nestjs/common';

export type HttpOutcome = 'success' | 'redirect' | 'failure' | 'aborted';
export type FailureClass =
  | 'none'
  | 'validation'
  | 'authentication'
  | 'permission'
  | 'not_found'
  | 'conflict'
  | 'rate_limit'
  | 'business_rule'
  | 'internal'
  | 'dependency'
  | 'timeout'
  | 'aborted'
  | 'unknown';

export function classifyHttpStatus(statusCode: number) {
  const statusFamily = `${Math.floor(statusCode / 100)}xx` as
    | '2xx'
    | '3xx'
    | '4xx'
    | '5xx';
  if (statusCode >= 200 && statusCode < 300)
    return {
      outcome: 'success' as const,
      failureClass: 'none' as const,
      level: 'info' as const,
      statusFamily,
    };
  if (statusCode >= 300 && statusCode < 400)
    return {
      outcome: 'redirect' as const,
      failureClass: 'none' as const,
      level: 'info' as const,
      statusFamily,
    };
  const failureClass: FailureClass =
    statusCode === 400 || statusCode === 422
      ? 'validation'
      : statusCode === 401
        ? 'authentication'
        : statusCode === 403
          ? 'permission'
          : statusCode === 404
            ? 'not_found'
            : statusCode === 409
              ? 'conflict'
              : statusCode === 429
                ? 'rate_limit'
                : statusCode >= 500
                  ? 'internal'
                  : 'unknown';
  return {
    outcome: 'failure' as const,
    failureClass,
    level: statusCode >= 500 ? ('error' as const) : ('warn' as const),
    statusFamily,
  };
}

export function classifyHttpException(
  error: unknown,
  statusCode: number,
): FailureClass {
  const response =
    error instanceof HttpException ? error.getResponse() : undefined;
  if (response && typeof response === 'object' && !Array.isArray(response)) {
    const rawCode = (response as Record<string, unknown>).errorCode;
    const code = typeof rawCode === 'string' ? rawCode.toUpperCase() : '';
    if (/DEPEND|UPSTREAM|DATABASE|SERVICE_UNAVAILABLE/.test(code))
      return 'dependency';
    if (/TIMEOUT|TIMED_OUT/.test(code)) return 'timeout';
    if (/BUSINESS|TRANSITION|ALREADY_|NOT_ALLOWED/.test(code))
      return 'business_rule';
  }
  return classifyHttpStatus(statusCode).failureClass;
}

export function normalizedRoute(request: {
  route?: { path?: string };
  baseUrl?: string;
  originalUrl?: string;
  url?: string;
}): string {
  const routePath = request.route?.path;
  if (typeof routePath === 'string' && routePath.length > 0)
    return `${request.baseUrl ?? ''}${routePath}`.replace(/\/+/g, '/');
  return (request.originalUrl ?? request.url ?? '').split('?')[0] || '/unknown';
}

export function inferHttpModule(controllerName: string, route: string): string {
  const source = `${controllerName} ${route}`.toLowerCase();
  const modules = [
    'auth',
    'appointments',
    'payments',
    'wallet',
    'practitioners',
    'packages',
    'chat',
    'notifications',
    'admin',
    'users',
  ];
  return modules.find((module) => source.includes(module)) ?? 'other';
}
