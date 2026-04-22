import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthenticatedQueryEnabled } from "../../auth/query-auth";
import { getPatientProfile, patchPatientProfile } from "./api";

const patientProfileQueryKeys = {
  all: ["patient-profile"] as const,
  me: () => [...patientProfileQueryKeys.all, "me"] as const,
};

export function usePatientProfile(enabled = true) {
  const authEnabled = useAuthenticatedQueryEnabled("patient");

  return useQuery({
    queryKey: patientProfileQueryKeys.me(),
    queryFn: getPatientProfile,
    enabled: enabled && authEnabled,
    staleTime: 60_000,
  });
}

export function usePatchPatientProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: patchPatientProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: patientProfileQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: ["auth"] });
    },
  });
}
