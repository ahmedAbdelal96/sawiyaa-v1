/**
 * Safe-metadata sanitizer for admin evidence responses.
 *
 * Strips sensitive keys (tokens, API keys, secrets, authorization headers,
 * raw payloads, webhooks secrets) from a metadata object before it leaves the
 * server. This is intentionally separate from `log-sanitizer.util.ts` so that
 * the response contract is independent of the logging path.
 *
 * Rules:
 *   - Top-level keys whose name matches a sensitive pattern (case-insensitive)
 *     are replaced with the literal string "[REDACTED]".
 *   - Non-sensitive nested objects are recursed into; arrays are mapped.
 *   - Non-string / non-number / non-boolean / non-null values are coerced to
 *     strings so the API contract stays JSON-safe.
 *   - Final output is restricted to: `string | number | boolean | null` at
 *     every leaf, which matches the DTO field type
 *     `Record<string, string | number | boolean | null>`.
 *
 * This util is pure: it has no side effects and no external state.
 */
/**
 * Case-insensitive sensitive-key patterns for outbound evidence metadata.
 * Covers tokens, API keys, auth headers, cookies, signatures, and secrets.
 * Must not accidentally redact safe generic fields (provider, occurredAt, etc.).
 */
const SENSITIVE_KEY_PATTERNS: readonly RegExp[] = [
  // ---- tokens (singular + plural) ----
  /^token$/i,
  /^tokens$/i,
  /^accessToken$/i,
  /^accessTokens$/i,
  /^refreshToken$/i,
  /^refreshTokens$/i,
  /^joinToken$/i,
  /^joinTokens$/i,
  /^idToken$/i,
  /^idTokens$/i,
  /^sessionToken$/i,
  /^sessionTokens$/i,
  /^roomToken$/i,
  /^roomTokens$/i,
  /^meetingToken$/i,
  /^meetingTokens$/i,
  /^providerToken$/i,
  /^providerTokens$/i,
  /^dailyToken$/i,
  /^dailyTokens$/i,
  /^apiToken$/i,
  // ---- defensive: any key ending with Token / Tokens ----
  /Token$/i,
  /Tokens$/i,
  // ---- auth / bearer ----
  /^authorization$/i,
  /^auth$/i,
  /^bearer$/i,
  /^authHeader$/i,
  /^authorizationHeader$/i,
  // ---- signatures / hmac ----
  /^signature$/i,
  /^hmac$/i,
  /^xDailySignature$/i,
  /^x-daily-signature$/i,
  /^dailySignature$/i,
  /^daily-signature$/i,
  /^webhookSignature$/i,
  /^webhook-signature$/i,
  /^signatureHeader$/i,
  /^sig$/i,
  /^dailySignatureHeader$/i,
  // ---- API keys / secrets ----
  /^apiKey$/i,
  /^api_key$/i,
  /^apiSecret$/i,
  /^secret$/i,
  /^privateKey$/i,
  /^clientSecret$/i,
  /^providerSecret$/i,
  /^dailyApiKey$/i,
  /^DAILY_API_KEY$/i,
  /^webhookSecret$/i,
  /^webhook/i,
  // ---- JWT ----
  /^jwt$/i,
  // ---- cookies / headers ----
  /^cookie$/i,
  /^cookies$/i,
  /^setCookie$/i,
  /^set-cookie$/i,
  /^header$/i,
  /^headers$/i,
  /^rawBody$/i,
  /^rawHeaders$/i,
  // ---- payload / body ----
  /^payload$/i,
  /^body$/i,
  /^checkoutUrl$/i,
  // ---- passwords ----
  /^password/i,
];

function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEY_PATTERNS.some((pattern) => pattern.test(key));
}

function sanitizeValue(value: unknown): string | number | boolean | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === 'string') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'boolean') return value;
  // Coerce anything else (Date, bigint, etc.) to string.
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'bigint') return value.toString();
  return String(value);
}

function sanitizeNode(value: unknown): string | number | boolean | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (Array.isArray(value)) {
    // We do not expose arrays of objects in safe metadata. Coerce each item.
    return value.map((item) => sanitizeValue(item)).join(', ');
  }
  if (typeof value === 'object') {
    return '[object]';
  }
  return sanitizeValue(value);
}

export function sanitizeSafeMetadata(
  input: unknown,
): Record<string, string | number | boolean | null> {
  if (input === null || input === undefined) {
    return {};
  }
  if (typeof input !== 'object' || Array.isArray(input)) {
    return {};
  }

  const source = input as Record<string, unknown>;
  const out: Record<string, string | number | boolean | null> = {};

  for (const key of Object.keys(source)) {
    if (isSensitiveKey(key)) {
      out[key] = '[REDACTED]';
      continue;
    }
    out[key] = sanitizeNode(source[key]);
  }

  return out;
}
