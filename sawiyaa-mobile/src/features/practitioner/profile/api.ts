import { apiClient, extractApiData } from "../../../lib/api";
import type {
  PractitionerApplicationStatusResult,
  PractitionerProfileResponse,
  PractitionerReadinessResponse,
  UpdatePractitionerProfileRequest,
  UpdatePractitionerProfileResponse,
} from "./types";

export async function getPractitionerProfile() {
  const response = await apiClient.get("/practitioners/me");
  return extractApiData<PractitionerProfileResponse>(response);
}

export async function updatePractitionerProfile(
  payload: UpdatePractitionerProfileRequest,
) {
  const response = await apiClient.patch("/practitioners/me", payload);
  return extractApiData<UpdatePractitionerProfileResponse>(response);
}

export async function getPractitionerReadiness() {
  const response = await apiClient.get("/practitioners/me/readiness");
  return extractApiData<PractitionerReadinessResponse>(response);
}

export async function getPractitionerApplicationStatus() {
  const response = await apiClient.get("/practitioners/me/application");
  return extractApiData<PractitionerApplicationStatusResult>(response);
}
