import { useQuery } from "@tanstack/react-query";
import { useAuthenticatedQueryEnabled } from "../../auth/query-auth";
import { apiClient, extractApiData } from "../../../lib/api";
import type { PatientJourneyResponseDto } from "./types";

export const patientJourneyQueryKey = ["patient-journey"] as const;

async function getMyJourney() {
  const response = await apiClient.get("/patients/me/journey");
  return extractApiData<PatientJourneyResponseDto>(response);
}

export function usePatientJourney() {
  const enabled = useAuthenticatedQueryEnabled("patient");

  return useQuery({
    queryKey: patientJourneyQueryKey,
    queryFn: getMyJourney,
    enabled,
    staleTime: 60_000,
  });
}
