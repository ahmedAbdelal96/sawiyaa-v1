import { useQuery } from "@tanstack/react-query";
import { getPatientJourney } from "../api/patient-journey.api";
import { patientJourneyQueryKeys } from "../constants/query-keys";

export function usePatientJourney() {
  return useQuery({
    queryKey: patientJourneyQueryKeys.me(),
    queryFn: getPatientJourney,
    staleTime: 30_000,
  });
}
