import httpClient from "@/lib/api/http-client";
import type { ApiPayload } from "@/lib/api/contracts";
import { extractData } from "@/lib/api/response";
import type {
  AdminPractitionerAvatarSuccessResponse,
  AdminPractitionersListResponse,
  ListAdminPractitionersParams,
  UpdateAdminPractitionerAvatarRequest,
} from "../types/admin-practitioners.types";

/**
 * Admin read-only practitioner directory.
 * This endpoint intentionally does not depend on public-profile publication constraints.
 */
export async function listAdminPractitioners(
  params: ListAdminPractitionersParams,
) {
  const response =
    await httpClient.get<ApiPayload<AdminPractitionersListResponse>>(
      "/admin/practitioners",
      { params },
    );

  return extractData(response.data);
}

export async function updateAdminPractitionerAvatar(
  practitionerId: string,
  data: UpdateAdminPractitionerAvatarRequest,
) {
  const response =
    await httpClient.patch<ApiPayload<AdminPractitionerAvatarSuccessResponse>>(
      `/admin/practitioners/${practitionerId}/avatar`,
      data,
    );

  return extractData(response.data);
}

export async function removeAdminPractitionerAvatar(practitionerId: string) {
  const response =
    await httpClient.delete<ApiPayload<AdminPractitionerAvatarSuccessResponse>>(
      `/admin/practitioners/${practitionerId}/avatar`,
    );

  return extractData(response.data);
}
