import httpClient from "@/lib/api/http-client";
import { extractData } from "@/lib/api/response";
import type { ApiPayload } from "@/lib/api/contracts";
import type {
  CurrentUserRolesResponse,
  CurrentUserSecurityStateResponse,
  CurrentUserPermissionsResponse,
  CurrentUserSummary,
} from "../types/users.types";

/**
 * Fetches the product-facing current user summary.
 * This is the main frontend bootstrap payload after auth.
 */
export async function getCurrentUser() {
  const response = await httpClient.get<ApiPayload<CurrentUserSummary>>("/users/me");
  return extractData(response.data);
}

/**
 * Fetches only role data for lightweight permission checks.
 */
export async function getCurrentUserRoles() {
  const response = await httpClient.get<ApiPayload<CurrentUserRolesResponse>>(
    "/users/me/roles"
  );
  return extractData(response.data);
}

/**
 * Fetches account/security state flags used for gating banners and route protection.
 */
export async function getCurrentUserSecurityState() {
  const response = await httpClient.get<ApiPayload<CurrentUserSecurityStateResponse>>(
    "/users/me/security-state"
  );
  return extractData(response.data);
}

export async function patchCurrentUserProfile(input: { displayName?: string }) {
  const response = await httpClient.patch<ApiPayload<{ message: string }>>("/users/me", input);
  return extractData(response.data);
}

export async function uploadCurrentUserAvatar(file: File) {
  const formData = new FormData();
  formData.append("file", file);
  const response = await httpClient.post<ApiPayload<{ message: string }>>("/users/me/avatar", formData);
  return extractData(response.data);
}

export async function removeCurrentUserAvatar() {
  const response = await httpClient.delete<ApiPayload<{ message: string }>>("/users/me/avatar");
  return extractData(response.data);
}

/**
 * Fetches resolved effective permission keys for the current user.
 * Used by admin navigation gating and page-level guards.
 * Backend guards remain authoritative — this is a UX read-hint only.
 */
export async function getCurrentUserPermissions() {
  const response = await httpClient.get<ApiPayload<CurrentUserPermissionsResponse>>(
    "/users/me/permissions"
  );
  return extractData(response.data);
}
