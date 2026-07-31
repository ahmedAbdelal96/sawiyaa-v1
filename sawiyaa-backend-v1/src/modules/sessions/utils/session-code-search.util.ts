/**
 * Builds an index-friendly canonical Session Code search.
 * `startsWith` deliberately covers exact matches too and avoids the leading
 * wildcard used by the legacy contains search.
 */
export function sessionCodeSearchFilter(value: string) {
  const normalized = value.trim().toUpperCase();
  return {
    startsWith: normalized,
    mode: 'insensitive' as const,
  };
}
