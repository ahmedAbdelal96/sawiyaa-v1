import { LOGGING_SENSITIVE_KEYS } from './logging.constants';

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function shouldRedact(key: string): boolean {
  const normalized = key.toLowerCase();
  return LOGGING_SENSITIVE_KEYS.some((sensitive) =>
    normalized.includes(sensitive.toLowerCase()),
  );
}

export function sanitizeForLogging<T>(payload: T): T {
  if (payload === null || payload === undefined) {
    return payload;
  }

  if (Array.isArray(payload)) {
    return payload.map((item) => sanitizeForLogging(item)) as T;
  }

  if (!isPlainObject(payload)) {
    return payload;
  }

  const output: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (shouldRedact(key)) {
      output[key] = '[REDACTED]';
      continue;
    }

    output[key] = sanitizeForLogging(value);
  }

  return output as T;
}
