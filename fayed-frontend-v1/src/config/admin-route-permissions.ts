/**
 * Admin route permission map - Phase 5: Permission-Aware Admin UX
 *
 * Maps existing admin page paths to the permissions required to access them.
 * Routes with an empty `requiresAny` array are open to all admin-class users.
 *
 * Rules:
 * - SUPER_ADMIN bypasses all checks (handled in canAccessAdminRoute).
 * - Unknown routes are open (no unintended lockout from newly added pages).
 * - Only map routes that actually exist in src/app/[locale]/(admin)/admin/*
 */

import { type PermissionKey } from "@/lib/auth/permissions";
import { PermissionKey as PK } from "@/lib/auth/permissions";

export interface AdminRoutePermissionConfig {
  /** The path WITHOUT the /admin prefix and WITHOUT the locale prefix. */
  path: string;
  /** User must have at least one of these permissions. Empty = open to all admin roles. */
  requiresAny: PermissionKey[];
}

/**
 * Admin route permission map.
 * Matching is prefix-based: /finance/dashboard matches /finance route config.
 */
export const ADMIN_ROUTE_PERMISSIONS: AdminRoutePermissionConfig[] = [
  { path: "/dashboard", requiresAny: [] },
  {
    path: "/sessions",
    requiresAny: [PK.SESSIONS_READ_ADMIN],
  },
  {
    path: "/patients",
    requiresAny: [PK.PATIENTS_READ_ADMIN, PK.PATIENTS_SENSITIVE_READ],
  },
  {
    path: "/practitioners/featured",
    requiresAny: [PK.FEATURED_PRACTITIONERS_READ],
  },
  { path: "/practitioners", requiresAny: [] },
  { path: "/practitioner-applications", requiresAny: [PK.PRACTITIONER_APPLICATIONS_READ] },
  {
    path: "/support",
    requiresAny: [PK.SUPPORT_TICKET_NOTE_INTERNAL, PK.SUPPORT_TICKET_ASSIGN],
  },
  {
    path: "/care-chat",
    requiresAny: [
      PK.CARE_CHAT_REQUEST_READ_ADMIN,
      PK.CARE_CHAT_CONVERSATION_READ_ADMIN,
      PK.CARE_CHAT_REQUEST_DECIDE,
    ],
  },
  {
    path: "/chat-conversations",
    requiresAny: [PK.CHAT_CONVERSATIONS_READ],
  },
  { path: "/assessments", requiresAny: [] },
  { path: "/articles", requiresAny: [] },
  { path: "/academy", requiresAny: [] },
  { path: "/training", requiresAny: [] },
  { path: "/specialties", requiresAny: [] },
  { path: "/package-plans", requiresAny: [] },
  { path: "/refund-policies", requiresAny: [] },
  { path: "/help", requiresAny: [] },
  {
    path: "/notifications",
    requiresAny: [PK.NOTIFICATION_OPS_READ],
  },
  {
    path: "/finance",
    requiresAny: [PK.FINANCE_EVENTS_READ, PK.ACCOUNTING_READ],
  },
  {
    path: "/settlements",
    requiresAny: [PK.SETTLEMENTS_READ, PK.SETTLEMENTS_WRITE],
  },
  {
    path: "/package-settlements",
    requiresAny: [PK.SETTLEMENTS_READ, PK.SETTLEMENTS_WRITE],
  },
  {
    path: "/practitioner-payouts",
    requiresAny: [PK.PRACTITIONER_PAYOUTS_READ, PK.PRACTITIONER_PAYOUTS_WRITE],
  },
  {
    path: "/payments",
    requiresAny: [PK.FINANCE_EVENTS_READ, PK.REFUNDS_APPROVE, PK.REFUNDS_RETRY],
  },
  { path: "/audit", requiresAny: [PK.AUDIT_LOG_READ] },
  { path: "/users", requiresAny: [PK.ADMIN_USERS_READ] },
  { path: "/reports", requiresAny: [PK.FINANCE_EVENTS_READ] },
  { path: "/moderation", requiresAny: [] },
  { path: "/reviews", requiresAny: [] },
  { path: "/admin-operations", requiresAny: [] },
  { path: "/settings", requiresAny: [] },
];

/**
 * Returns the permission config for a given admin sub-path.
 * Matches by longest prefix first so /finance/ledger hits /finance.
 * Returns null if no config found (treated as open route).
 */
export function getAdminRoutePermissionConfig(
  adminSubPath: string
): AdminRoutePermissionConfig | null {
  const normalized = "/" + adminSubPath.replace(/^\//, "").replace(/\/$/, "");

  let best: AdminRoutePermissionConfig | null = null;
  let bestLen = -1;

  for (const config of ADMIN_ROUTE_PERMISSIONS) {
    const configPath = config.path;
    const isExact = normalized === configPath;
    const isPrefix =
      normalized.startsWith(configPath + "/") || normalized.startsWith(configPath + "?");

    if ((isExact || isPrefix) && configPath.length > bestLen) {
      best = config;
      bestLen = configPath.length;
    }
  }

  return best;
}
