import { LOGGING_SENSITIVE_KEYS } from './logging.constants';

const REDACTED_QUERY_PARAMS = new Set([
  'token',
  'payment_token',
  'hmac',
  'publicaccesstoken',
]);
const REDIRECT_URL_QUERY_PARAMS = new Set([
  'returnurl',
  'redirecturl',
  'callbackurl',
]);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function shouldRedact(key: string): boolean {
  const normalized = key.toLowerCase();
  return LOGGING_SENSITIVE_KEYS.some((sensitive) =>
    normalized.includes(sensitive.toLowerCase()),
  );
}

function redactUrlLikeString(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) {
    return trimmed;
  }

  try {
    const parsed = new URL(trimmed, 'http://redaction.local');

    for (const key of [...parsed.searchParams.keys()]) {
      const normalizedKey = key.toLowerCase();

      if (REDACTED_QUERY_PARAMS.has(normalizedKey)) {
        parsed.searchParams.set(key, '[REDACTED]');
        continue;
      }

      if (REDIRECT_URL_QUERY_PARAMS.has(normalizedKey)) {
        const nestedValue = parsed.searchParams.get(key);
        if (nestedValue) {
          parsed.searchParams.set(key, redactUrlLikeString(nestedValue));
        }
      }
    }

    const serialized = `${parsed.pathname}${parsed.search}${parsed.hash}`;
    if (/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(trimmed)) {
      return `${parsed.protocol}//${parsed.host}${serialized}`;
    }

    return serialized;
  } catch {
    return trimmed;
  }
}

export function sanitizeForLogging<T>(payload: T): T {
  const seen = new WeakSet<object>();
  const visit = (value: unknown, depth: number): unknown => {
    if (value === null || value === undefined || typeof value !== 'object')
      return value;
    if (depth >= 8) return '[TRUNCATED]';
    if (seen.has(value)) return '[CIRCULAR]';
    if (Array.isArray(value)) {
      seen.add(value);
      return value.map((item) => visit(item, depth + 1));
    }
    if (!isPlainObject(value)) return value;
    seen.add(value);
    const output: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value)) {
      output[key] = shouldRedact(key) ? '[REDACTED]' : visit(child, depth + 1);
    }
    return output;
  };
  return visit(payload, 0) as T;
}

export function redactUrlForLogging(
  url: string | null | undefined,
): string | null {
  if (url === null || url === undefined) {
    return url ?? null;
  }

  const trimmed = url.trim();
  if (!trimmed) {
    return trimmed;
  }

  return redactUrlLikeString(trimmed);
}
