import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getPractitionerApplicationStatus,
  getPractitionerCredentials,
  getPractitionerProfile,
  getPractitionerReadiness,
  getPractitionerSpecialties,
  removePractitionerAvatar,
  setPractitionerSpecialties,
  submitPractitionerApplication,
  updatePractitionerAvatar,
  updatePractitionerProfile,
  uploadPractitionerCredentialFile,
} from "../api/practitioners.api";
import { practitionersQueryKeys } from "../constants/query-keys";
import type { SubmitPractitionerApplicationRequest } from "../types/practitioners.types";

/**
 * Returns current practitioner profile summary.
 */
export function usePractitionerProfile(enabled = true) {
  return useQuery({
    queryKey: practitionersQueryKeys.me(),
    queryFn: getPractitionerProfile,
    enabled,
    staleTime: 60_000,
    gcTime: 10 * 60_000,
  });
}

/**
 * Updates profile and refreshes all practitioner dependent queries.
 */
export function useUpdatePractitionerProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updatePractitionerProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: practitionersQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["auth"] });
    },
  });
}

/**
 * Updates practitioner avatar and refreshes profile snapshot.
 */
export function useUpdatePractitionerAvatar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updatePractitionerAvatar,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: practitionersQueryKeys.me() });
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["auth"] });
    },
  });
}

/**
 * Removes practitioner avatar and refreshes profile snapshot.
 */
export function useRemovePractitionerAvatar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: removePractitionerAvatar,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: practitionersQueryKeys.me() });
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["auth"] });
    },
  });
}

/**
 * Reads linked specialties for current practitioner.
 */
export function usePractitionerSpecialties(enabled = true) {
  return useQuery({
    queryKey: practitionersQueryKeys.meSpecialties(),
    queryFn: getPractitionerSpecialties,
    enabled,
    staleTime: 60_000,
    gcTime: 10 * 60_000,
  });
}

/**
 * Replaces specialties and invalidates profile/readiness/application slices.
 */
export function useSetPractitionerSpecialties() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: setPractitionerSpecialties,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: practitionersQueryKeys.me() });
      queryClient.invalidateQueries({
        queryKey: practitionersQueryKeys.meSpecialties(),
      });
      queryClient.invalidateQueries({
        queryKey: practitionersQueryKeys.meReadiness(),
      });
      queryClient.invalidateQueries({
        queryKey: practitionersQueryKeys.meApplication(),
      });
    },
  });
}

/**
 * Reads practitioner credentials metadata.
 */
export function usePractitionerCredentials(enabled = true) {
  return useQuery({
    queryKey: practitionersQueryKeys.meCredentials(),
    queryFn: getPractitionerCredentials,
    enabled,
    staleTime: 30_000,
    gcTime: 10 * 60_000,
  });
}

/**
 * Uploads credential metadata and refreshes readiness/profile/application snapshots.
 */
export function useUploadPractitionerCredential() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: uploadPractitionerCredentialFile,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: practitionersQueryKeys.meCredentials(),
      });
      queryClient.invalidateQueries({
        queryKey: practitionersQueryKeys.meReadiness(),
      });
      queryClient.invalidateQueries({
        queryKey: practitionersQueryKeys.me(),
      });
      queryClient.invalidateQueries({
        queryKey: practitionersQueryKeys.meApplication(),
      });
    },
  });
}

/**
 * Reads current application status summary.
 */
export function usePractitionerApplicationStatus(enabled = true) {
  return useQuery({
    queryKey: practitionersQueryKeys.meApplication(),
    queryFn: getPractitionerApplicationStatus,
    enabled,
    staleTime: 30_000,
    gcTime: 10 * 60_000,
  });
}

/**
 * Submits practitioner application and refreshes dependent status/readiness/profile caches.
 */
export function useSubmitPractitionerApplication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data?: SubmitPractitionerApplicationRequest) =>
      submitPractitionerApplication(data ?? {}),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: practitionersQueryKeys.meApplication(),
      });
      queryClient.invalidateQueries({
        queryKey: practitionersQueryKeys.meReadiness(),
      });
      queryClient.invalidateQueries({
        queryKey: practitionersQueryKeys.me(),
      });
    },
  });
}

/**
 * Reads deterministic readiness checks before application submit.
 */
export function usePractitionerReadiness(enabled = true) {
  return useQuery({
    queryKey: practitionersQueryKeys.meReadiness(),
    queryFn: getPractitionerReadiness,
    enabled,
    staleTime: 30_000,
    gcTime: 10 * 60_000,
  });
}
