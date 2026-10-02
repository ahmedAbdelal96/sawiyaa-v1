import { useMutation, useQuery } from "@tanstack/react-query";
import { useAuthenticatedQueryEnabled } from "../../auth/query-auth";
import { apiClient, extractApiData } from "../../../lib/api";
import i18n from "../../../i18n";
import type {
  PatientHomeResponseDto,
  PatientJourneyResponseDto,
  TrackPractitionerViewResponseDto,
} from "./types";

export const patientJourneyQueryKey = ["patient-journey"] as const;
export const patientHomeQueryKey = (locale = i18n.language) =>
  ["patient-home", locale] as const;

async function getMyJourney() {
  const response = await apiClient.get("/patients/me/journey");
  return extractApiData<PatientJourneyResponseDto>(response);
}

async function getMyHome() {
  const response = await apiClient.get("/patients/me/home");
  return extractApiData<PatientHomeResponseDto>(response);
}

async function trackPractitionerView(slug: string) {
  const response = await apiClient.post(`/patients/me/practitioner-views/${slug}`);
  return extractApiData<TrackPractitionerViewResponseDto>(response);
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

export function usePatientHome(options?: { enabled?: boolean }) {
  const enabled =
    useAuthenticatedQueryEnabled("patient") && options?.enabled !== false;

  return useQuery({
    queryKey: patientHomeQueryKey(),
    queryFn: getMyHome,
    enabled,
    staleTime: 30_000,
  });
}

export function useTrackPractitionerView() {
  const enabled = useAuthenticatedQueryEnabled("patient");

  return useMutation({
    mutationFn: (slug: string) => {
      if (!enabled) {
        return Promise.resolve(null);
      }
      return trackPractitionerView(slug);
    },
  });
}
