import { NotificationProviderErrorCategory } from './notification-provider-outcome';

export function classifyProviderHttpStatus(
  status: number,
  providerErrorCode?: string,
): NotificationProviderErrorCategory {
  if (status === 429) return 'RATE_LIMITED';
  if (status === 408 || status === 425 || status >= 500) return 'TRANSIENT';
  if (status === 401 || status === 403) return 'CONFIGURATION';
  if (status === 400 || status === 404 || status === 422) {
    if (
      providerErrorCode &&
      /RECIPIENT|EMAIL|ADDRESS|NOT_REGISTERED|INVALID_TO/i.test(
        providerErrorCode,
      )
    ) {
      return 'RECIPIENT_INVALID';
    }
    return 'PERMANENT';
  }
  return status >= 400 && status < 500 ? 'PERMANENT' : 'UNKNOWN_OUTCOME';
}

export function parseRetryAfterMs(
  value: string | null | undefined,
  now = Date.now(),
): number | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (/^\d+(?:\.\d+)?$/.test(trimmed)) {
    return Math.max(0, Math.ceil(Number(trimmed) * 1_000));
  }
  const timestamp = Date.parse(trimmed);
  if (!Number.isFinite(timestamp)) return undefined;
  return Math.max(0, timestamp - now);
}

export function classifyNetworkError(
  error: unknown,
): NotificationProviderErrorCategory | undefined {
  if (!error || typeof error !== 'object') return undefined;
  const code = (error as { code?: unknown }).code;
  // DNS resolution errors are known to happen before an HTTP request is sent.
  // Other socket failures remain UNKNOWN because acceptance cannot be proven.
  return code === 'ENOTFOUND' || code === 'EAI_AGAIN' ? 'TRANSIENT' : undefined;
}
