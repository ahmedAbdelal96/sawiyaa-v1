import type { UserStatus } from "@/features/auth/types/auth.types";

export const ADMIN_USER_INTERNAL_ROLES = [
  "SUPER_ADMIN",
  "ADMIN",
  "SUPPORT",
  "FINANCE_STAFF",
  "MARKETING_STAFF",
  "PRACTITIONER_REVIEWER",
  "PATIENT_OPERATIONS",
  "CONTENT_REVIEWER",
] as const;

export type AdminUserRole = (typeof ADMIN_USER_INTERNAL_ROLES)[number];

export const ADMIN_USER_STATUS_VALUES = [
  "ACTIVE",
  "INACTIVE",
  "SUSPENDED",
  "PENDING_VERIFICATION",
  "PENDING_APPROVAL",
  "DELETED",
] as const satisfies readonly UserStatus[];

export type AdminUserPermissionEffect = "ALLOW" | "DENY";

export const ADMIN_USER_PERMISSION_EFFECTS = ["ALLOW", "DENY"] as const;

export interface AdminUserListItem {
  id: string;
  displayName: string | null;
  status: UserStatus;
  primaryEmail: string | null;
  primaryPhone: string | null;
  roles: AdminUserRole[];
  createdAt: string;
  updatedAt: string;
}

export interface AdminUsersPagination {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

export interface AdminUsersListResponse {
  message: string;
  items: AdminUserListItem[];
  pagination: AdminUsersPagination;
}

export interface AdminUserEmail {
  value: string;
}

export interface AdminUserPhone {
  value: string;
}

export interface AdminUserDetails {
  id: string;
  displayName: string | null;
  status: UserStatus;
  tokenVersion: number;
  defaultLocale: string | null;
  timezone: string | null;
  emails: string[];
  phones: string[];
  roles: AdminUserRole[];
  createdAt: string;
  updatedAt: string;
}

export interface AdminUserDetailsResponse {
  message: string;
  item: AdminUserDetails;
}

export interface AdminUserPermissionOverride {
  permissionKey: string;
  effect: AdminUserPermissionEffect;
  reason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminUserPermissionOverridesResponse {
  message: string;
  items: AdminUserPermissionOverride[];
}

export interface AdminUserListQuery {
  page: number;
  limit: number;
  q?: string;
  role?: AdminUserRole;
  status?: UserStatus;
}

export interface AdminUserCreateInput {
  displayName: string;
  email: string;
  phone?: string;
  roles: AdminUserRole[];
  status?: UserStatus;
  password: string;
}

export interface AdminUserUpdateProfileInput {
  displayName?: string;
  defaultLocale?: string;
  timezone?: string;
}

export interface AdminUserUpdateStatusInput {
  status: UserStatus;
  reason?: string;
}

export interface AdminUserUpdateRolesInput {
  roles: AdminUserRole[];
  reason?: string;
}

export interface AdminUserPermissionOverrideOperation {
  permissionKey: string;
  effect?: AdminUserPermissionEffect | null;
  reason?: string;
}

export interface AdminUserUpdatePermissionOverridesInput {
  operations: AdminUserPermissionOverrideOperation[];
}

export interface AdminStepUpVerifyInput {
  password: string;
}

export interface AdminStepUpVerifyResult {
  message: string;
  expiresAt: string;
}
