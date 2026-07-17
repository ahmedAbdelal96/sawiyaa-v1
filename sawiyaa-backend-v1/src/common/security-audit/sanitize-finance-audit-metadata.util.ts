const BLOCKED_KEY = /(password|secret|token|authorization|cookie|cvv|cvc|cardnumber|card_number|clientsecret|checkouturl|rawbody|accesskey)/i;
const MAX_DEPTH = 4;
const MAX_KEYS = 40;
const MAX_ARRAY = 20;
const MAX_STRING = 500;

export function sanitizeFinanceAuditValue(value: unknown, depth = 0): unknown {
  if (depth > MAX_DEPTH) return '[TRUNCATED]';
  if (value === null || typeof value === 'boolean' || typeof value === 'number') return value;
  if (typeof value === 'string') return value.slice(0, MAX_STRING);
  if (Array.isArray(value)) return value.slice(0, MAX_ARRAY).map((item) => sanitizeFinanceAuditValue(item, depth + 1));
  if (typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>).slice(0, MAX_KEYS)) {
      result[key] = BLOCKED_KEY.test(key) ? '[REDACTED]' : sanitizeFinanceAuditValue(item, depth + 1);
    }
    return result;
  }
  return String(value).slice(0, MAX_STRING);
}

export function sanitizeFinanceAuditMetadata(value: unknown): Record<string, unknown> | null {
  const sanitized = sanitizeFinanceAuditValue(value);
  return sanitized && typeof sanitized === 'object' && !Array.isArray(sanitized)
    ? (sanitized as Record<string, unknown>)
    : null;
}
