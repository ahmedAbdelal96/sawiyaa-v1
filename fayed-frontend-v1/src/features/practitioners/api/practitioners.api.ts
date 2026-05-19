import httpClient from "@/lib/api/http-client";
import { extractData } from "@/lib/api/response";
import type { ApiPayload } from "@/lib/api/contracts";
import type {
  PractitionerApplicationStatusSuccessResponse,
  PractitionerCredentialListResponse,
  PractitionerCredentialUploadSuccessResponse,
  PractitionerAvatarSuccessResponse,
  PractitionerProfileSuccessResponse,
  PractitionerReadinessSuccessResponse,
  PractitionerSpecialtiesSuccessResponse,
  SubmitPractitionerApplicationRequest,
  SetPractitionerSpecialtiesRequest,
  UpdatePractitionerProfileRequest,
  UpdatePractitionerAvatarRequest,
  UploadPractitionerCredentialFileRequest,
  UploadPractitionerCredentialMetadataRequest,
} from "../types/practitioners.types";

/**
 * Reads current practitioner profile summary.
 */
export async function getPractitionerProfile() {
  const response = await httpClient.get<ApiPayload<PractitionerProfileSuccessResponse>>(
    "/practitioners/me"
  );
  return extractData(response.data);
}

/**
 * Updates current practitioner profile baseline fields.
 */
export async function updatePractitionerProfile(
  data: UpdatePractitionerProfileRequest
) {
  const response = await httpClient.patch<ApiPayload<PractitionerProfileSuccessResponse>>(
    "/practitioners/me",
    data
  );
  return extractData(response.data);
}

/**
 * Updates current practitioner avatar URL.
 */
export async function updatePractitionerAvatar(
  data: UpdatePractitionerAvatarRequest
) {
  const hasFile = data.file instanceof File;

  const response = hasFile
    ? await httpClient.patch<ApiPayload<PractitionerAvatarSuccessResponse>>(
        "/practitioners/me/avatar",
        (() => {
          const formData = new FormData();
          formData.append("file", data.file as File);
          if (data.avatarUrl) {
            formData.append("avatarUrl", data.avatarUrl);
          }
          return formData;
        })()
      )
    : await httpClient.patch<ApiPayload<PractitionerAvatarSuccessResponse>>(
        "/practitioners/me/avatar",
        data
      );
  return extractData(response.data);
}

/**
 * Removes current practitioner avatar URL.
 */
export async function removePractitionerAvatar() {
  const response = await httpClient.delete<ApiPayload<PractitionerAvatarSuccessResponse>>(
    "/practitioners/me/avatar"
  );
  return extractData(response.data);
}

/**
 * Replaces practitioner specialties with the provided links.
 */
export async function setPractitionerSpecialties(
  data: SetPractitionerSpecialtiesRequest
) {
  const response = await httpClient.put<ApiPayload<PractitionerSpecialtiesSuccessResponse>>(
    "/practitioners/me/specialties",
    data
  );
  return extractData(response.data);
}

/**
 * Lists currently linked specialties for the current practitioner.
 */
export async function getPractitionerSpecialties() {
  const response = await httpClient.get<ApiPayload<PractitionerSpecialtiesSuccessResponse>>(
    "/practitioners/me/specialties"
  );
  return extractData(response.data);
}

/**
 * Uploads metadata-only practitioner credential record.
 */
export async function uploadPractitionerCredential(
  data: UploadPractitionerCredentialMetadataRequest
) {
  const response =
    await httpClient.post<ApiPayload<PractitionerCredentialUploadSuccessResponse>>(
      "/practitioners/me/credentials",
      data
    );
  return extractData(response.data);
}

/**
 * Uploads practitioner credential file and creates credential metadata in one request.
 */
export async function uploadPractitionerCredentialFile(
  data: UploadPractitionerCredentialFileRequest
) {
  const formData = new FormData();
  formData.append("file", data.file);
  formData.append("credentialType", data.credentialType);
  if (data.expiresAt) {
    formData.append("expiresAt", data.expiresAt);
  }

  const response =
    await httpClient.post<ApiPayload<PractitionerCredentialUploadSuccessResponse>>(
      "/practitioners/me/credentials/upload",
      formData
    );
  return extractData(response.data);
}

/**
 * Lists practitioner credential metadata records.
 */
export async function getPractitionerCredentials() {
  const response = await httpClient.get<ApiPayload<PractitionerCredentialListResponse>>(
    "/practitioners/me/credentials"
  );
  return extractData(response.data);
}

/**
 * Submits practitioner application with optional profile/specialty/payout patch payload.
 */
export async function submitPractitionerApplication(
  data: SubmitPractitionerApplicationRequest = {}
) {
  const response =
    await httpClient.post<ApiPayload<PractitionerApplicationStatusSuccessResponse>>(
      "/practitioners/me/application/submit",
      data
    );
  return extractData(response.data);
}

/**
 * Gets application status summary for the current practitioner.
 */
export async function getPractitionerApplicationStatus() {
  const response =
    await httpClient.get<ApiPayload<PractitionerApplicationStatusSuccessResponse>>(
      "/practitioners/me/application"
    );
  return extractData(response.data);
}

/**
 * Gets readiness snapshot used before application submission.
 */
export async function getPractitionerReadiness() {
  const response = await httpClient.get<ApiPayload<PractitionerReadinessSuccessResponse>>(
    "/practitioners/me/readiness"
  );
  return extractData(response.data);
}
