import type { AdminUserRole } from "../types/admin-users.types";
import { ADMIN_USER_INTERNAL_ROLES, ADMIN_USER_STATUS_VALUES } from "../types/admin-users.types";

export const ADMIN_USER_ROLE_LABEL_KEYS: Record<AdminUserRole, string> = {
  SUPER_ADMIN: "roles.superAdmin",
  ADMIN: "roles.admin",
  SUPPORT: "roles.support",
  FINANCE_STAFF: "roles.financeStaff",
  MARKETING_STAFF: "roles.marketingStaff",
  PRACTITIONER_REVIEWER: "roles.practitionerReviewer",
  PATIENT_OPERATIONS: "roles.patientOperations",
  CONTENT_REVIEWER: "roles.contentReviewer",
};

export const ADMIN_USER_STATUS_TONE: Record<
  (typeof ADMIN_USER_STATUS_VALUES)[number],
  "primary" | "success" | "warning" | "neutral" | "danger"
> = {
  ACTIVE: "success",
  INACTIVE: "neutral",
  SUSPENDED: "warning",
  PENDING_VERIFICATION: "warning",
  PENDING_APPROVAL: "warning",
  DELETED: "danger",
};

export function normalizeAdminUserRole(role: string): AdminUserRole | null {
  return (ADMIN_USER_INTERNAL_ROLES as readonly string[]).includes(role) ? (role as AdminUserRole) : null;
}

export function formatAdminUserIdentity(primaryValue: string | null | undefined) {
  return primaryValue?.trim() || "—";
}
