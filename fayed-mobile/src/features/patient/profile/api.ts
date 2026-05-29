import { apiClient, extractApiData } from "../../../lib/api";
import type {
  PatientProfileResponse,
  UpdatePatientProfilePayload,
} from "./types";

export async function getPatientProfile() {
  const response = await apiClient.get("/patients/me");
  return extractApiData<PatientProfileResponse>(response);
}

export async function patchPatientProfile(payload: UpdatePatientProfilePayload) {
  const response = await apiClient.patch("/patients/me", payload);
  return extractApiData<PatientProfileResponse>(response);
}

export interface PatientAvatarResponse {
  message: string;
  avatar: {
    patientProfileId: string;
    avatarUrl: string;
  };
}

export async function uploadPatientAvatar(file: {
  uri: string;
  name: string;
  type: string;
}): Promise<PatientAvatarResponse> {
  const formData = new FormData();
  formData.append("file", {
    uri: file.uri,
    name: file.name,
    type: file.type,
  } as unknown as Blob);

  const response = await apiClient.post("/patients/me/avatar", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return extractApiData<PatientAvatarResponse>(response);
}

export async function removePatientAvatar(): Promise<PatientAvatarResponse> {
  const response = await apiClient.delete("/patients/me/avatar");
  return extractApiData<PatientAvatarResponse>(response);
}
