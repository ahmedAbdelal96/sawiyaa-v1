import httpClient from "@/lib/api/http-client";
import { extractData } from "@/lib/api/response";
import type { ApiPayload } from "@/lib/api/contracts";
import type {
  ApprovePractitionerApplicationRequest,
  CreateAdminPractitionerRequest,
  ListPractitionerApplicationsParams,
  PractitionerApplicationDecisionResponse,
  PractitionerApplicationDetailsResponse,
  PractitionerApplicationsListResponse,
  RejectPractitionerApplicationRequest,
  UpdatePractitionerApplicationDraftRequest,
} from "../types/practitioner-applications.types";

/**
 * Lists practitioner applications for admin review queue.
 */
export async function listAdminPractitionerApplications(
  params?: ListPractitionerApplicationsParams
) {
  const response = await httpClient.get<ApiPayload<PractitionerApplicationsListResponse>>(
    "/admin/practitioner-applications",
    { params }
  );
  return extractData(response.data);
}

/**
 * Reads details for one practitioner application.
 */
export async function getAdminPractitionerApplicationDetails(id: string) {
  const response =
    await httpClient.get<ApiPayload<PractitionerApplicationDetailsResponse>>(
      `/admin/practitioner-applications/${id}`
    );
  return extractData(response.data);
}

/**
 * Approves a practitioner application.
 */
export async function approveAdminPractitionerApplication(
  id: string,
  data: ApprovePractitionerApplicationRequest
) {
  const response =
    await httpClient.post<ApiPayload<PractitionerApplicationDecisionResponse>>(
      `/admin/practitioner-applications/${id}/approve`,
      data
    );
  return extractData(response.data);
}

/**
 * Rejects a practitioner application.
 */
export async function rejectAdminPractitionerApplication(
  id: string,
  data: RejectPractitionerApplicationRequest
) {
  const response =
    await httpClient.post<ApiPayload<PractitionerApplicationDecisionResponse>>(
      `/admin/practitioner-applications/${id}/reject`,
      data
    );
  return extractData(response.data);
}

/**
 * Updates practitioner application draft/submitted fields from admin review scope.
 */
export async function updateAdminPractitionerApplicationDraft(
  id: string,
  data: UpdatePractitionerApplicationDraftRequest
) {
  const response =
    await httpClient.patch<ApiPayload<PractitionerApplicationDecisionResponse>>(
      `/admin/practitioner-applications/${id}`,
      data
    );
  return extractData(response.data);
}

/**
 * Creates a practitioner directly from admin scope (without self-submitted application flow).
 */
export async function createAdminPractitionerDirectly(
  data: CreateAdminPractitionerRequest
) {
  const response =
    await httpClient.post<ApiPayload<PractitionerApplicationDecisionResponse>>(
      "/admin/practitioner-applications/direct-create",
      data
    );
  return extractData(response.data);
}
