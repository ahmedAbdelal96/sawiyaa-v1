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
