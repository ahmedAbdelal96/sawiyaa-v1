import { useQuery } from "@tanstack/react-query";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthenticatedQueryEnabled } from "../../auth/query-auth";
import {
  getPractitionerApplicationStatus,
  getPractitionerProfile,
  getPractitionerReadiness,
  updatePractitionerProfile,
} from "./api";
import type { UpdatePractitionerProfileRequest } from "./types";

export const practitionerProfileQueryKeys = {
  all: ["practitioner-profile"] as const,
  me: () => [...practitionerProfileQueryKeys.all, "me"] as const,
  readiness: () => [...practitionerProfileQueryKeys.all, "readiness"] as const,
  application: () =>
    [...practitionerProfileQueryKeys.all, "application"] as const,
};

export function usePractitionerProfile(enabled = true) {
  const authEnabled = useAuthenticatedQueryEnabled("practitioner");

  return useQuery({
    queryKey: practitionerProfileQueryKeys.me(),
    queryFn: getPractitionerProfile,
    enabled: enabled && authEnabled,
    staleTime: 60_000,
  });
}

export function usePractitionerReadiness(enabled = true) {
  const authEnabled = useAuthenticatedQueryEnabled("practitioner");

  return useQuery({
    queryKey: practitionerProfileQueryKeys.readiness(),
    queryFn: getPractitionerReadiness,
    enabled: enabled && authEnabled,
    staleTime: 30_000,
  });
}

export function usePractitionerApplicationStatus(enabled = true) {
  const authEnabled = useAuthenticatedQueryEnabled("practitioner");

  return useQuery({
    queryKey: practitionerProfileQueryKeys.application(),
    queryFn: getPractitionerApplicationStatus,
    enabled: enabled && authEnabled,
    staleTime: 30_000,
  });
}

export function useUpdatePractitionerProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdatePractitionerProfileRequest) =>
      updatePractitionerProfile(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: practitionerProfileQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: ["auth"] });
    },
  });
}
