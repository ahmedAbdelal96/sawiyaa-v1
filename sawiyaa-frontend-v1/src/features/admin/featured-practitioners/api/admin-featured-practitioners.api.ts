import httpClient from "@/lib/api/http-client";
import type { ApiPayload } from "@/lib/api/contracts";
import { extractData } from "@/lib/api/response";
import type {
  AdminFeaturedPlacement,
  AdminFeaturedPlacementHistoryItem,
  AdminFeaturedPlacementsListResponse,
  CreateAdminFeaturedPlacementInput,
  ListAdminFeaturedPlacementsParams,
  PlacementActionNoteInput,
  UpdateAdminFeaturedPlacementInput,
} from "../types/admin-featured-practitioners.types";

const FEATURED_BASE_PATH = "/admin/featured-practitioners";

export async function listAdminFeaturedPlacements(
  params: ListAdminFeaturedPlacementsParams,
) {
  const response =
    await httpClient.get<ApiPayload<AdminFeaturedPlacementsListResponse>>(
      FEATURED_BASE_PATH,
      { params },
    );
  return extractData(response.data);
}

export async function getAdminFeaturedPlacement(id: string) {
  const response = await httpClient.get<ApiPayload<AdminFeaturedPlacement>>(
    `${FEATURED_BASE_PATH}/${id}`,
  );
  return extractData(response.data);
}

export async function createAdminFeaturedPlacement(
  payload: CreateAdminFeaturedPlacementInput,
) {
  const response = await httpClient.post<ApiPayload<AdminFeaturedPlacement>>(
    FEATURED_BASE_PATH,
    payload,
  );
  return extractData(response.data);
}

export async function updateAdminFeaturedPlacement(
  id: string,
  payload: UpdateAdminFeaturedPlacementInput,
) {
  const response = await httpClient.patch<ApiPayload<AdminFeaturedPlacement>>(
    `${FEATURED_BASE_PATH}/${id}`,
    payload,
  );
  return extractData(response.data);
}

export async function pauseAdminFeaturedPlacement(
  id: string,
  payload: PlacementActionNoteInput,
) {
  const response = await httpClient.post<ApiPayload<AdminFeaturedPlacement>>(
    `${FEATURED_BASE_PATH}/${id}/pause`,
    payload,
  );
  return extractData(response.data);
}

export async function resumeAdminFeaturedPlacement(
  id: string,
  payload: PlacementActionNoteInput,
) {
  const response = await httpClient.post<ApiPayload<AdminFeaturedPlacement>>(
    `${FEATURED_BASE_PATH}/${id}/resume`,
    payload,
  );
  return extractData(response.data);
}

export async function listAdminFeaturedPlacementHistory(id: string) {
  const response =
    await httpClient.get<ApiPayload<AdminFeaturedPlacementHistoryItem[]>>(
      `${FEATURED_BASE_PATH}/${id}/history`,
    );
  return extractData(response.data);
}
