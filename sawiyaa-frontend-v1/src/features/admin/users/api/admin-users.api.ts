import type { ApiPayload } from "@/lib/api/contracts";
import httpClient from "@/lib/api/http-client";
import { extractData } from "@/lib/api/response";
import type {
  AdminStepUpVerifyInput,
  AdminStepUpVerifyResult,
  AdminUserCreateInput,
  AdminUserDetailsResponse,
  AdminUserListQuery,
  AdminUserPermissionOverridesResponse,
  AdminUserUpdatePermissionOverridesInput,
  AdminUserUpdateProfileInput,
  AdminUserUpdateRolesInput,
  AdminUserUpdateStatusInput,
  AdminUsersListResponse,
} from "../types/admin-users.types";

function buildAdminUsersSearchParams(query: Partial<AdminUserListQuery>) {
  const params = new URLSearchParams();

  if (typeof query.page === "number") params.set("page", String(query.page));
  if (typeof query.limit === "number") params.set("limit", String(query.limit));
  if (query.q) params.set("q", query.q);
  if (query.role) params.set("role", query.role);
  if (query.status) params.set("status", query.status);

  return params;
}

export async function listAdminUsers(query: AdminUserListQuery) {
  const response = await httpClient.get<ApiPayload<AdminUsersListResponse>>(
    `/admin/users?${buildAdminUsersSearchParams(query).toString()}`
  );
  return extractData(response.data);
}

export async function getAdminUser(id: string) {
  const response = await httpClient.get<ApiPayload<AdminUserDetailsResponse>>(`/admin/users/${id}`);
  return extractData(response.data);
}

export async function createAdminUser(input: AdminUserCreateInput) {
  const response = await httpClient.post<ApiPayload<{ message: string }>>("/admin/users", input);
  return extractData(response.data);
}

export async function updateAdminUserProfile(id: string, input: AdminUserUpdateProfileInput) {
  const response = await httpClient.patch<ApiPayload<{ message: string }>>(`/admin/users/${id}`, input);
  return extractData(response.data);
}

export async function updateAdminUserStatus(id: string, input: AdminUserUpdateStatusInput) {
  const response = await httpClient.patch<ApiPayload<{ message: string }>>(
    `/admin/users/${id}/status`,
    input
  );
  return extractData(response.data);
}

export async function updateAdminUserRoles(id: string, input: AdminUserUpdateRolesInput) {
  const response = await httpClient.patch<ApiPayload<{ message: string }>>(
    `/admin/users/${id}/roles`,
    input
  );
  return extractData(response.data);
}

export async function getAdminUserPermissionOverrides(id: string) {
  const response = await httpClient.get<ApiPayload<AdminUserPermissionOverridesResponse>>(
    `/admin/users/${id}/permission-overrides`
  );
  return extractData(response.data);
}

export async function updateAdminUserPermissionOverrides(
  id: string,
  input: AdminUserUpdatePermissionOverridesInput
) {
  const response = await httpClient.patch<ApiPayload<{ message: string }>>(
    `/admin/users/${id}/permission-overrides`,
    input
  );
  return extractData(response.data);
}

export async function revokeAdminUserSessions(id: string) {
  const response = await httpClient.post<ApiPayload<{ message: string }>>(
    `/admin/users/${id}/sessions/revoke`
  );
  return extractData(response.data);
}

export async function invalidateAdminUserTokenVersion(id: string) {
  const response = await httpClient.post<ApiPayload<{ message: string }>>(
    `/admin/users/${id}/token-version/invalidate`
  );
  return extractData(response.data);
}

export async function verifyAdminStepUp(input: AdminStepUpVerifyInput) {
  const response = await httpClient.post<ApiPayload<AdminStepUpVerifyResult>>(
    "/auth/admin/step-up/verify",
    input
  );
  return extractData(response.data);
}
