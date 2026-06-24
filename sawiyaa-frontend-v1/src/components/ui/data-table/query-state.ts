/**
 * DataTable query-state helpers.
 *
 * Shared, type-safe helpers to normalize list query params and
 * build updated URLSearchParams objects for admin table screens.
 */

export type QueryParamValue = string | number | null | undefined;

export function parsePositiveIntParam(
  value: string | null,
  fallback: number,
  options?: { min?: number; max?: number },
): number {
  const parsed = Number.parseInt(value ?? "", 10);
  if (Number.isNaN(parsed)) return fallback;
  const min = options?.min ?? 1;
  const max = options?.max;
  if (parsed < min) return fallback;
  if (typeof max === "number" && parsed > max) return fallback;
  return parsed;
}

export function parseEnumParam<T extends string>(
  value: string | null,
  allowed: readonly T[],
  fallback: T,
): T {
  if (!value) return fallback;
  return allowed.includes(value as T) ? (value as T) : fallback;
}

export function parseTextParam(
  value: string | null,
  options?: { maxLength?: number; trim?: boolean },
): string {
  const maxLength = options?.maxLength ?? 100;
  const trim = options?.trim ?? true;
  const safe = typeof value === "string" ? value : "";
  const normalized = trim ? safe.trim() : safe;
  return normalized.slice(0, maxLength);
}

export function buildUpdatedSearchParams(
  current: URLSearchParams,
  updates: Record<string, QueryParamValue>,
): URLSearchParams {
  const next = new URLSearchParams(current.toString());

  Object.entries(updates).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      next.delete(key);
      return;
    }
    next.set(key, String(value));
  });

  return next;
}
