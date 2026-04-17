import type { JourneyApiResponse } from "@/modules/journey/domain/journey.types";
import { unwrapApiData } from "@/networking/contracts/api-envelope";
import { httpClient } from "@/networking/http/client";

export async function getJourneyRequest() {
  const response = await httpClient.get("/patients/me/journey");
  return unwrapApiData(response.data) as JourneyApiResponse;
}

