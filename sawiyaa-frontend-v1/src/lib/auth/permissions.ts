/**
 * Frontend permission utilities — Phase 5: Permission-Aware Admin UX
 *
 * Source of truth: Backend is authoritative. These utilities are UX/defense-in-depth only.
 * They gate navigation visibility and page rendering, NOT actual data access.
 *
 * Backend contract: GET /users/me/permissions → { userId, permissions: PermissionKey[] }
 * Empty permissions array = deny everything (fail-safe by default).
 * SUPER_ADMIN receives all concrete permission keys from the backend resolver.
 *
 * ROLE_PERMISSION_MAP is kept for reference/documentation only.
 * It is NOT used as a fallback — empty permissions = empty set = deny.
 */

// ──────────────────────────────────────────────────────────────────
// Permission key enum — mirror of backend PermissionKey enum.
// Keep in sync with: sawiyaa-backend-v1/src/common/enums/permission-key.enum.ts
// ──────────────────────────────────────────────────────────────────
export const PermissionKey = {
  FINANCE_EVENTS_READ: "finance.events.read",
  ACCOUNTING_READ: "finance.accounting.read",
  ACCOUNTING_WRITE: "finance.accounting.write",
  SETTLEMENTS_READ: "settlements.read",
  SETTLEMENTS_WRITE: "settlements.write",
  PRACTITIONER_PAYOUTS_READ: "practitioner-payouts.read",
  PRACTITIONER_PAYOUTS_WRITE: "practitioner-payouts.write",
  PRACTITIONER_STATEMENTS_READ: "practitioner-statements.read",
  NOTIFICATION_OPS_READ: "notification-ops.read",
  AUDIT_LOG_READ: "audit-log.read",
  REFUNDS_APPROVE: "refunds.approve",
  REFUNDS_RETRY: "refunds.retry",
  SESSIONS_READ_ADMIN: "sessions.read.admin",
  SESSIONS_READ_SUPPORT_SUMMARY: "sessions.read.supportSummary",
  SESSIONS_MANUAL_DECISIONS_WRITE: "sessions.manualDecisions.write",
  CARE_CHAT_REQUEST_DECIDE: "careChat.request.decide",
  CARE_CHAT_REQUEST_READ_ADMIN: "careChat.request.read.admin",
  CARE_CHAT_CONVERSATION_READ_ADMIN: "careChat.conversation.read.admin",
  CHAT_CONVERSATIONS_READ: "chat.conversations.read",
  CHAT_CONVERSATIONS_MODERATE: "chat.conversations.moderate",
  CHAT_ATTACHMENTS_READ: "chat.attachments.read",
  PATIENTS_READ_ADMIN: "patients.read.admin",
  PATIENTS_SENSITIVE_READ: "patients.sensitive.read",
  SUPPORT_TICKET_NOTE_INTERNAL: "support.ticket.note.internal",
  SUPPORT_TICKET_ASSIGN: "support.ticket.assign",
  PRACTITIONER_APPLICATIONS_READ: "practitionerApplications.read",
  PRACTITIONER_APPLICATIONS_APPROVE: "practitionerApplications.approve",
  PRACTITIONER_APPLICATIONS_REJECT: "practitionerApplications.reject",
  PRACTITIONER_APPLICATIONS_REQUEST_CHANGES: "practitionerApplications.requestChanges",
  FEATURED_PRACTITIONERS_READ: "featured-practitioners.read",
  FEATURED_PRACTITIONERS_MANAGE: "featured-practitioners.manage",
  ADMIN_USERS_READ: "admin-users.read",
  ADMIN_USERS_CREATE: "admin-users.create",
  ADMIN_USERS_UPDATE: "admin-users.update",
  ADMIN_USERS_STATUS_UPDATE: "admin-users.status.update",
  ADMIN_USERS_ROLES_UPDATE: "admin-users.roles.update",
  ADMIN_USERS_PERMISSION_OVERRIDES_READ: "admin-users.permission-overrides.read",
  ADMIN_USERS_PERMISSION_OVERRIDES_UPDATE: "admin-users.permission-overrides.update",
  ADMIN_USERS_SESSIONS_REVOKE: "admin-users.sessions.revoke",
  ADMIN_USERS_TOKEN_VERSION_INVALIDATE: "admin-users.token-version.invalidate",
} as const;

export type PermissionKey = (typeof PermissionKey)[keyof typeof PermissionKey];

// ──────────────────────────────────────────────────────────────────
// Admin-class roles — mirrors backend AppRole enum (admin-area subset).
// Keep in sync with: sawiyaa-backend-v1/src/common/enums/app-role.enum.ts
// ──────────────────────────────────────────────────────────────────
export type AdminRole =
  | "SUPER_ADMIN"
  | "ADMIN"
  | "FINANCE_STAFF"
  | "MARKETING_STAFF"
  | "PRACTITIONER_REVIEWER"
  | "PATIENT_OPERATIONS"
  | "SUPPORT_AGENT"
  | "CONTENT_REVIEWER";

// ──────────────────────────────────────────────────────────────────
// Role → permissions map.
// Mirrors the backend RolePermission seed / permissions guard defaults.
// SUPER_ADMIN is handled separately (passes all checks).
// ──────────────────────────────────────────────────────────────────
const ROLE_PERMISSION_MAP: Partial<Record<AdminRole, PermissionKey[]>> = {
  ADMIN: [
    PermissionKey.SESSIONS_READ_ADMIN,
    PermissionKey.PATIENTS_READ_ADMIN,
    PermissionKey.CARE_CHAT_REQUEST_READ_ADMIN,
    PermissionKey.CARE_CHAT_CONVERSATION_READ_ADMIN,
    PermissionKey.CHAT_CONVERSATIONS_READ,
    PermissionKey.CHAT_CONVERSATIONS_MODERATE,
    PermissionKey.CHAT_ATTACHMENTS_READ,
    PermissionKey.SUPPORT_TICKET_NOTE_INTERNAL,
    PermissionKey.SUPPORT_TICKET_ASSIGN,
    PermissionKey.NOTIFICATION_OPS_READ,
    PermissionKey.AUDIT_LOG_READ,
    PermissionKey.FINANCE_EVENTS_READ,
    PermissionKey.ACCOUNTING_READ,
    PermissionKey.SETTLEMENTS_READ,
    PermissionKey.PRACTITIONER_PAYOUTS_READ,
    PermissionKey.PRACTITIONER_STATEMENTS_READ,
    PermissionKey.REFUNDS_APPROVE,
    PermissionKey.REFUNDS_RETRY,
  ],
  FINANCE_STAFF: [
    PermissionKey.FINANCE_EVENTS_READ,
    PermissionKey.ACCOUNTING_READ,
    PermissionKey.ACCOUNTING_WRITE,
    PermissionKey.SETTLEMENTS_READ,
    PermissionKey.SETTLEMENTS_WRITE,
    PermissionKey.PRACTITIONER_PAYOUTS_READ,
    PermissionKey.PRACTITIONER_PAYOUTS_WRITE,
    PermissionKey.PRACTITIONER_STATEMENTS_READ,
    PermissionKey.REFUNDS_APPROVE,
    PermissionKey.REFUNDS_RETRY,
  ],
  SUPPORT_AGENT: [
    PermissionKey.SESSIONS_READ_SUPPORT_SUMMARY,
    PermissionKey.CARE_CHAT_REQUEST_READ_ADMIN,
    PermissionKey.CARE_CHAT_CONVERSATION_READ_ADMIN,
    PermissionKey.CARE_CHAT_REQUEST_DECIDE,
    PermissionKey.CHAT_CONVERSATIONS_READ,
    PermissionKey.CHAT_ATTACHMENTS_READ,
    PermissionKey.SUPPORT_TICKET_NOTE_INTERNAL,
    PermissionKey.SUPPORT_TICKET_ASSIGN,
    PermissionKey.PATIENTS_READ_ADMIN,
  ],
  CONTENT_REVIEWER: [
    PermissionKey.SESSIONS_READ_ADMIN,
  ],
  PRACTITIONER_REVIEWER: [
    PermissionKey.AUDIT_LOG_READ,
    PermissionKey.PRACTITIONER_APPLICATIONS_READ,
    PermissionKey.PRACTITIONER_APPLICATIONS_APPROVE,
    PermissionKey.PRACTITIONER_APPLICATIONS_REJECT,
    PermissionKey.PRACTITIONER_APPLICATIONS_REQUEST_CHANGES,
  ],
  PATIENT_OPERATIONS: [
    PermissionKey.PATIENTS_READ_ADMIN,
    PermissionKey.PATIENTS_SENSITIVE_READ,
    PermissionKey.SESSIONS_READ_ADMIN,
    PermissionKey.SUPPORT_TICKET_NOTE_INTERNAL,
    PermissionKey.SUPPORT_TICKET_ASSIGN,
  ],
  MARKETING_STAFF: [],
};

export function getRoleDefaultPermissionKeys(role: AdminRole): PermissionKey[] {
  return ROLE_PERMISSION_MAP[role] ?? [];
}

export function getRoleDefaultPermissionSet(role: AdminRole): Set<PermissionKey> {
  return new Set(getRoleDefaultPermissionKeys(role));
}

export function getDefaultPermissionsForRoles(roles: string[]): Set<string> {
  const permissions = new Set<string>();

  for (const role of roles) {
    if (role in ROLE_PERMISSION_MAP) {
      for (const permission of ROLE_PERMISSION_MAP[role as AdminRole] ?? []) {
        permissions.add(permission);
      }
    }
  }

  return permissions;
}

// ──────────────────────────────────────────────────────────────────
// Minimal user shape needed for permission checks.
// Accepts both cookie-based AuthUser (single role string) and
// /users/me-based CurrentUserSummary (roles array).
// ──────────────────────────────────────────────────────────────────
export interface PermissionCheckUser {
  roles?: string[];
  role?: string;
  /** Future: when backend returns per-user permissions */
  permissions?: string[];
}

function getUserRoles(user: PermissionCheckUser): string[] {
  if (user.roles && user.roles.length > 0) return user.roles;
  if (user.role) return [user.role];
  return [];
}

function derivePermissions(user: PermissionCheckUser): Set<string> {
  // Use real backend permissions. Empty array = no permissions = deny.
  // SUPER_ADMIN gets all concrete keys from backend resolvePermissions().
  // ROLE_PERMISSION_MAP is NOT used as fallback — missing permissions must deny.
  if (user.permissions) {
    return new Set(user.permissions);
  }
  return new Set<string>();
}

// ──────────────────────────────────────────────────────────────────
// Public API
// ──────────────────────────────────────────────────────────────────

/**
 * Returns true if the user has the specified permission.
 * SUPER_ADMIN always returns true.
 */
export function hasPermission(
  user: PermissionCheckUser | null | undefined,
  permission: PermissionKey
): boolean {
  if (!user) return false;
  if (isSuperAdmin(user)) return true;
  return derivePermissions(user).has(permission);
}

/**
 * Returns true if the user has at least one of the specified permissions.
 * SUPER_ADMIN always returns true.
 * Empty permissions array returns false.
 */
export function hasAnyPermission(
  user: PermissionCheckUser | null | undefined,
  permissions: PermissionKey[]
): boolean {
  if (!user) return false;
  if (permissions.length === 0) return false;
  if (isSuperAdmin(user)) return true;
  const userPerms = derivePermissions(user);
  return permissions.some((p) => userPerms.has(p));
}

/**
 * Returns true if the user has ALL of the specified permissions.
 * SUPER_ADMIN always returns true.
 * Empty permissions array returns true (vacuously true).
 */
export function hasAllPermissions(
  user: PermissionCheckUser | null | undefined,
  permissions: PermissionKey[]
): boolean {
  if (!user) return false;
  if (permissions.length === 0) return true;
  if (isSuperAdmin(user)) return true;
  const userPerms = derivePermissions(user);
  return permissions.every((p) => userPerms.has(p));
}

/**
 * Returns true if the user has the specified role.
 */
export function hasRole(
  user: PermissionCheckUser | null | undefined,
  role: string
): boolean {
  if (!user) return false;
  return getUserRoles(user).includes(role);
}

/**
 * Returns true if the user is a SUPER_ADMIN.
 */
export function isSuperAdmin(
  user: PermissionCheckUser | null | undefined
): boolean {
  if (!user) return false;
  return getUserRoles(user).includes("SUPER_ADMIN");
}

/**
 * Returns true if the user can access an admin route based on its permission config.
 * A route with no permissions configured is open to all admin-class users.
 */
export function canAccessAdminRoute(
  user: PermissionCheckUser | null | undefined,
  requiredPermissions: PermissionKey[]
): boolean {
  if (!user) return false;
  if (requiredPermissions.length === 0) return true;
  return hasAnyPermission(user, requiredPermissions);
}
