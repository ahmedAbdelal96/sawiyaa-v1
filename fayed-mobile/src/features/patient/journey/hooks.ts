import { useQuery } from "@tanstack/react-query";
import { useAuthenticatedQueryEnabled } from "../../auth/query-auth";
import { apiClient, extractApiData } from "../../../lib/api";
import type { PatientJourneyResponseDto } from "./types";

async function getMyJourney() {
  const response = await apiClient.get("/patients/me/journey");
  return extractApiData<PatientJourneyResponseDto>(response);
}

export function usePatientJourney() {
  const enabled = useAuthenticatedQueryEnabled("patient");

  return useQuery({
    queryKey: ["patient-journey"],
    queryFn: getMyJourney,
    enabled,
    staleTime: 60_000,
  });
}
