export type RouteParamValue = string | string[] | undefined;

/** Normalize Expo Router params without inventing a fallback identifier. */
export function getFirstRouteParam(value: RouteParamValue): string | null {
  const candidate = Array.isArray(value) ? value[0] : value;
  const normalized = candidate?.trim();
  return normalized || null;
}
