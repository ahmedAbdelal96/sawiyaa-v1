import httpClient from "@/lib/api/http-client";
import { extractData } from "@/lib/api/response";
import type { ApiPayload } from "@/lib/api/contracts";
import type { PatientJourney, PatientJourneyResponseData } from "../types/patient-journey.types";

export async function getPatientJourney(): Promise<PatientJourney> {
  const response = await httpClient.get<ApiPayload<PatientJourneyResponseData>>(
    "/patients/me/journey",
  );
  return extractData(response.data).item;
}
