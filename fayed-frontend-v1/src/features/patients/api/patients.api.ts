import httpClient from "@/lib/api/http-client";
import { extractData } from "@/lib/api/response";
import type { ApiPayload } from "@/lib/api/contracts";
import type {
  PatientAvatarSuccessResponse,
  PatientProfileSuccessResponse,
  UpdatePatientProfileRequest,
} from "../types/patients.types";

/**
 * Reads the current patient profile for the authenticated patient account.
 */
export async function getPatientProfile() {
  const response = await httpClient.get<ApiPayload<PatientProfileSuccessResponse>>(
    "/patients/me"
  );
  return extractData(response.data);
}

/**
 * Updates current patient profile baseline fields and optional onboarding completion.
 */
export async function updatePatientProfile(data: UpdatePatientProfileRequest) {
  const response = await httpClient.patch<ApiPayload<PatientProfileSuccessResponse>>(
    "/patients/me",
    data
  );
  return extractData(response.data);
}

/**
 * Uploads/replaces current patient avatar image.
 */
export async function uploadPatientAvatar(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await httpClient.post<ApiPayload<PatientAvatarSuccessResponse>>(
    "/patients/me/avatar",
    formData
  );
  return extractData(response.data);
}

/**
 * Removes current patient avatar image.
 */
export async function removePatientAvatar() {
  const response = await httpClient.delete<ApiPayload<PatientAvatarSuccessResponse>>(
    "/patients/me/avatar"
  );
  return extractData(response.data);
}
