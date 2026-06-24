import httpClient from "@/lib/api/http-client";
import { extractData } from "@/lib/api/response";
import type { ApiPayload } from "@/lib/api/contracts";
import type {
  CreateSpecialtyCategoryRequest,
  CreateSpecialtyRequest,
  ListSpecialtiesParams,
  SpecialtiesListResponse,
  SpecialtyCategorySuccessResponse,
  SpecialtyCategoriesListResponse,
  SpecialtySuccessResponse,
  ToggleSpecialtyStatusRequest,
  UpdateSpecialtyCategoryRequest,
  UpdateSpecialtyRequest,
} from "../types/specialties.types";

/**
 * Public specialties listing.
 * Locale is resolved by the shared HTTP client through Accept-Language.
 */
export async function listSpecialties(params?: ListSpecialtiesParams) {
  const response = await httpClient.get<ApiPayload<SpecialtiesListResponse>>(
    "/specialties",
    { params }
  );
  return extractData(response.data);
}

/**
 * Admin specialties listing endpoint.
 * Returns active and inactive specialties for management screens.
 */
export async function listAdminSpecialties(params?: ListSpecialtiesParams) {
  const response = await httpClient.get<ApiPayload<SpecialtiesListResponse>>(
    "/admin/specialties",
    { params }
  );
  return extractData(response.data);
}

/**
 * Public specialty details by slug.
 */
export async function getSpecialtyBySlug(slug: string) {
  const response = await httpClient.get<ApiPayload<SpecialtySuccessResponse>>(
    `/specialties/${slug}`
  );
  return extractData(response.data);
}

/**
 * Public specialty-categories endpoint.
 * Returns real category records used by admin/practitioner catalog flows.
 */
export async function listSpecialtyCategories() {
  const response = await httpClient.get<ApiPayload<SpecialtyCategoriesListResponse>>(
    "/specialty-categories"
  );
  return extractData(response.data);
}

/**
 * Admin specialty-categories listing endpoint.
 * Returns active and inactive categories for management screens.
 */
export async function listAdminSpecialtyCategories(params?: ListSpecialtiesParams) {
  const response = await httpClient.get<ApiPayload<SpecialtyCategoriesListResponse>>(
    "/admin/specialties/categories",
    { params }
  );
  return extractData(response.data);
}

/**
 * Admin specialty create endpoint.
 */
export async function createSpecialty(data: CreateSpecialtyRequest) {
  const response = await httpClient.post<ApiPayload<SpecialtySuccessResponse>>(
    "/admin/specialties",
    data
  );
  return extractData(response.data);
}

/**
 * Admin specialty-category create endpoint.
 */
export async function createSpecialtyCategory(data: CreateSpecialtyCategoryRequest) {
  const response = await httpClient.post<ApiPayload<SpecialtyCategorySuccessResponse>>(
    "/admin/specialties/categories",
    data
  );
  return extractData(response.data);
}

/**
 * Admin specialty-category update endpoint.
 */
export async function updateSpecialtyCategory(
  id: string,
  data: UpdateSpecialtyCategoryRequest
) {
  const response = await httpClient.patch<ApiPayload<SpecialtyCategorySuccessResponse>>(
    `/admin/specialties/categories/${id}`,
    data
  );
  return extractData(response.data);
}

/**
 * Admin specialty update endpoint.
 */
export async function updateSpecialty(id: string, data: UpdateSpecialtyRequest) {
  const response = await httpClient.patch<ApiPayload<SpecialtySuccessResponse>>(
    `/admin/specialties/${id}`,
    data
  );
  return extractData(response.data);
}

/**
 * Admin specialty active/inactive toggle endpoint.
 */
export async function toggleSpecialtyStatus(
  id: string,
  data: ToggleSpecialtyStatusRequest
) {
  const response = await httpClient.patch<ApiPayload<SpecialtySuccessResponse>>(
    `/admin/specialties/${id}/toggle-status`,
    data
  );
  return extractData(response.data);
}
