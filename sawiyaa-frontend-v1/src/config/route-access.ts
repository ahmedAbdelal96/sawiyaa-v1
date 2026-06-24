/**
 * Frontend route access configuration.
 *
 * Real product roles and the areas they map to:
 * - PATIENT            → /patient/*
 * - PRACTITIONER       → /practitioner/*
 * - ADMIN              → /admin/*
 * - SUPER_ADMIN        → /admin/*  (same surface as ADMIN)
 * - FINANCE_STAFF      → /admin/*  (admin-class operational role)
 * - MARKETING_STAFF    → /admin/*  (admin-class operational role)
 * - PRACTITIONER_REVIEWER → /admin/* (admin-class operational role)
 * - PATIENT_OPERATIONS  → /admin/*  (admin-class operational role)
 * - SUPPORT_AGENT      → /admin/*  (operational sub-role)
 * - CONTENT_REVIEWER   → /admin/*  (operational sub-role)
 */

export type AppRole =
  | "ADMIN"
  | "FINANCE_STAFF"
  | "MARKETING_STAFF"
  | "PRACTITIONER_REVIEWER"
  | "PATIENT_OPERATIONS"
  | "SUPPORT_AGENT"
  | "CONTENT_REVIEWER"
  | "PATIENT"
  | "PRACTITIONER"
  | "SUPER_ADMIN";

// RawRole covers legacy aliases that may still appear in JWT payloads or cookies
// from older sessions. The resolveRole function normalizes them to AppRole.
type RawRole = AppRole | "SUPPORT";

export type RouteArea =
  | "public"
  | "auth"
  | "patient"
  | "practitioner"
  | "admin"
  | "unknown";

export const AUTH_ROUTES = ["/signin", "/signup"] as const;

export const PUBLIC_ROUTES = [
  "/",
  "/error-404",
  "/practitioners",
  "/about",
  "/contact",
  "/legal",
  "/privacy",
  "/terms",
] as const;

// Legacy /super-admin and /superadmin URLs are normalized to /admin in proxy.ts
export const SUPERADMIN_CANONICAL_PREFIX = "/super-admin";
export const SUPERADMIN_LEGACY_PREFIX = "/superadmin";

export const PATIENT_CANONICAL_PREFIX = "/patient";
export const PRACTITIONER_CANONICAL_PREFIX = "/practitioner";
export const ADMIN_CANONICAL_PREFIX = "/admin";

export const PATIENT_ROUTE_PREFIXES = [PATIENT_CANONICAL_PREFIX] as const;
export const PRACTITIONER_ROUTE_PREFIXES = [PRACTITIONER_CANONICAL_PREFIX] as const;
export const ADMIN_ROUTE_PREFIXES = [ADMIN_CANONICAL_PREFIX] as const;

export const ADMIN_CLASS_ROLES = [
  "ADMIN",
  "FINANCE_STAFF",
  "MARKETING_STAFF",
  "PRACTITIONER_REVIEWER",
  "PATIENT_OPERATIONS",
  "SUPPORT_AGENT",
  "CONTENT_REVIEWER",
  "SUPER_ADMIN",
] as const satisfies readonly AppRole[];

const ADMIN_CLASS_ROLE_SET = new Set<AppRole>(ADMIN_CLASS_ROLES);

export function resolveRole(role: string | undefined | null): AppRole | null {
  if (!role) return null;

  const normalized = role as RawRole;

  if (
    normalized === "ADMIN" ||
    normalized === "FINANCE_STAFF" ||
    normalized === "MARKETING_STAFF" ||
    normalized === "PRACTITIONER_REVIEWER" ||
    normalized === "PATIENT_OPERATIONS" ||
    normalized === "PATIENT" ||
    normalized === "PRACTITIONER" ||
    normalized === "SUPPORT_AGENT" ||
    normalized === "CONTENT_REVIEWER" ||
    normalized === "SUPER_ADMIN"
  ) {
    return normalized;
  }

  // Backward-compatible alias: older JWT payloads may carry "SUPPORT".
  if (normalized === "SUPPORT") return "SUPPORT_AGENT";

  return null;
}

export function normalizeToCanonicalPath(pathWithoutLocale: string): string {
  if (
    pathWithoutLocale === SUPERADMIN_LEGACY_PREFIX ||
    pathWithoutLocale === SUPERADMIN_CANONICAL_PREFIX
  ) {
    return ADMIN_CANONICAL_PREFIX;
  }

  if (pathWithoutLocale.startsWith(`${SUPERADMIN_LEGACY_PREFIX}/`)) {
    return pathWithoutLocale.replace(SUPERADMIN_LEGACY_PREFIX, ADMIN_CANONICAL_PREFIX);
  }

  if (pathWithoutLocale.startsWith(`${SUPERADMIN_CANONICAL_PREFIX}/`)) {
    return pathWithoutLocale.replace(SUPERADMIN_CANONICAL_PREFIX, ADMIN_CANONICAL_PREFIX);
  }

  return pathWithoutLocale;
}

export function classifyRouteArea(pathWithoutLocale: string): RouteArea {
  if (matchesAny(pathWithoutLocale, AUTH_ROUTES)) return "auth";
  if (matchesAny(pathWithoutLocale, PUBLIC_ROUTES)) return "public";
  if (matchesAny(pathWithoutLocale, PATIENT_ROUTE_PREFIXES)) return "patient";
  if (matchesAny(pathWithoutLocale, PRACTITIONER_ROUTE_PREFIXES)) return "practitioner";
  if (matchesAny(pathWithoutLocale, ADMIN_ROUTE_PREFIXES)) return "admin";
  return "unknown";
}

export function getDefaultRouteByRole(role: AppRole): string {
  if (role === "PATIENT") return PATIENT_CANONICAL_PREFIX;
  if (role === "PRACTITIONER") return `${PRACTITIONER_CANONICAL_PREFIX}/dashboard`;
  return `${ADMIN_CANONICAL_PREFIX}/dashboard`;
}

export function isRoleAllowedInArea(
  role: AppRole,
  area: Exclude<RouteArea, "public" | "auth" | "unknown">,
): boolean {
  if (area === "patient") return role === "PATIENT";
  if (area === "practitioner") return role === "PRACTITIONER";

  // Admin area accepts all active admin-class roles on the shared /admin/* surface.
  return ADMIN_CLASS_ROLE_SET.has(role);
}

function matchesAny(pathWithoutLocale: string, candidates: readonly string[]): boolean {
  return candidates.some(
    (candidate) =>
      pathWithoutLocale === candidate ||
      pathWithoutLocale.startsWith(`${candidate}/`),
  );
}
