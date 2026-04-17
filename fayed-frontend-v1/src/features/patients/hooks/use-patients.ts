import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getPatientProfile,
  removePatientAvatar,
  updatePatientProfile,
  uploadPatientAvatar,
} from "../api/patients.api";
import { patientsQueryKeys } from "../constants/query-keys";

/**
 * Query wrapper for current patient profile.
 */
export function usePatientProfile(enabled = true) {
  return useQuery({
    queryKey: patientsQueryKeys.me(),
    queryFn: getPatientProfile,
    enabled,
    staleTime: 60_000,
    gcTime: 10 * 60_000,
  });
}

/**
 * Mutation wrapper for current patient profile updates.
 * Invalidates users/auth caches because locale/displayName can affect global UI.
 */
export function useUpdatePatientProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updatePatientProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: patientsQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["auth"] });
    },
  });
}

/**
 * Uploads/replaces current patient avatar and refreshes profile snapshot.
 */
export function useUploadPatientAvatar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: uploadPatientAvatar,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: patientsQueryKeys.me() });
    },
  });
}

/**
 * Removes current patient avatar and refreshes profile snapshot.
 */
export function useRemovePatientAvatar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: removePatientAvatar,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: patientsQueryKeys.me() });
    },
  });
}
