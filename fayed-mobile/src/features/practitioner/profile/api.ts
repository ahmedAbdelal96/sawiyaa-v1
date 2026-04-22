import { apiClient, extractApiData } from "../../../lib/api";
import type { PractitionerProfileResponse } from "./types";

export async function getPractitionerProfile() {
  const response = await apiClient.get("/practitioners/me");
  return extractApiData<PractitionerProfileResponse>(response);
}
