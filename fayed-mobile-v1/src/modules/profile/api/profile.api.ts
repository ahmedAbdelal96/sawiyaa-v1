import type { PatientProfileResponse } from "@/modules/profile/domain/profile.types";
import { unwrapApiData } from "@/networking/contracts/api-envelope";
import { httpClient } from "@/networking/http/client";

export async function getCurrentPatientProfileRequest() {
  const response = await httpClient.get<PatientProfileResponse>("/patients/me");
  return unwrapApiData(response.data);
}
