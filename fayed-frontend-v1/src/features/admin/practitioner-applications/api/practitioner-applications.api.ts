import httpClient from "@/lib/api/http-client";
import { extractData } from "@/lib/api/response";
import type { ApiPayload } from "@/lib/api/contracts";
import type {
  ApprovePractitionerApplicationRequest,
  AdminDirectPractitionerCreateResponse,
  AdminPreparedPractitionerCredentialResponse,
  CreateAdminPractitionerRequest,
  UploadAdminPractitionerCredentialFileRequest,
  ListPractitionerApplicationsParams,
  PractitionerApplicationDecisionResponse,
  PractitionerApplicationCredentialResponse,
  PractitionerApplicationCredentialDeleteResponse,
  PractitionerApplicationDetailsResponse,
  PractitionerApplicationsListResponse,
  RejectPractitionerApplicationRequest,
  RequestPractitionerApplicationChangesRequest,
  CreateAdminPractitionerApplicationCredentialRequest,
  UpdateAdminPractitionerApplicationCredentialRequest,
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
 * Requests changes for a practitioner application (editable again).
 */
export async function requestChangesAdminPractitionerApplication(
  id: string,
  data: RequestPractitionerApplicationChangesRequest
) {
  const response =
    await httpClient.post<ApiPayload<PractitionerApplicationDecisionResponse>>(
      `/admin/practitioner-applications/${id}/request-changes`,
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
 * Adds one credential for the target practitioner application from admin review scope.
 */
export async function createAdminPractitionerApplicationCredential(
  id: string,
  data: CreateAdminPractitionerApplicationCredentialRequest
) {
  const response =
    await httpClient.post<ApiPayload<PractitionerApplicationCredentialResponse>>(
      `/admin/practitioner-applications/${id}/credentials`,
      data
    );
  return extractData(response.data);
}

/**
 * Updates one credential for the target practitioner application from admin review scope.
 */
export async function updateAdminPractitionerApplicationCredential(
  id: string,
  credentialId: string,
  data: UpdateAdminPractitionerApplicationCredentialRequest
) {
  const response =
    await httpClient.patch<ApiPayload<PractitionerApplicationCredentialResponse>>(
      `/admin/practitioner-applications/${id}/credentials/${credentialId}`,
      data
    );
  return extractData(response.data);
}

/**
 * Deletes one credential for the target practitioner application from admin review scope.
 */
export async function deleteAdminPractitionerApplicationCredential(
  id: string,
  credentialId: string
) {
  const response =
    await httpClient.delete<ApiPayload<PractitionerApplicationCredentialDeleteResponse>>(
      `/admin/practitioner-applications/${id}/credentials/${credentialId}`
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
    await httpClient.post<ApiPayload<AdminDirectPractitionerCreateResponse>>(
      "/admin/practitioner-applications/direct-create",
      data
    );
  return extractData(response.data);
}

/**
 * Uploads a credential file for direct practitioner creation and returns a managed fileUrl.
 */
export async function uploadAdminDirectPractitionerCredentialFile(
  data: UploadAdminPractitionerCredentialFileRequest
) {
  const formData = new FormData();
  formData.append("file", data.file);
  formData.append("credentialType", data.credentialType);
  if (data.expiresAt) {
    formData.append("expiresAt", data.expiresAt);
  }

  const response =
    await httpClient.post<ApiPayload<AdminPreparedPractitionerCredentialResponse>>(
      "/admin/practitioner-applications/direct-create/credentials/upload",
      formData
    );
  return extractData(response.data);
}
