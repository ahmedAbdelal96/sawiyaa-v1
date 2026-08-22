import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getPractitionerApplicationStatus,
  listPractitionerCountries,
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
  deletePractitionerCredential,
  viewPractitionerCredential,
  saveApplicationDraft,
  getPractitionerRequirements,
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
 * Updates profile and refreshes the read models affected by profile review.
 */
export function useUpdatePractitionerProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updatePractitionerProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: practitionersQueryKeys.me() });
      queryClient.invalidateQueries({ queryKey: practitionersQueryKeys.meReadiness() });
      queryClient.invalidateQueries({ queryKey: practitionersQueryKeys.meApplication() });
      queryClient.invalidateQueries({ queryKey: practitionersQueryKeys.meSpecialties() });
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
 * Reads active countries for practitioner selectors.
 */
export function usePractitionerCountries(enabled = true) {
  return useQuery({
    queryKey: practitionersQueryKeys.meCountries(),
    queryFn: listPractitionerCountries,
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

export function useDeletePractitionerCredential() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deletePractitionerCredential,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: practitionersQueryKeys.meCredentials() });
      queryClient.invalidateQueries({ queryKey: practitionersQueryKeys.meReadiness() });
      queryClient.invalidateQueries({ queryKey: practitionersQueryKeys.me() });
      queryClient.invalidateQueries({ queryKey: practitionersQueryKeys.meApplication() });
    },
  });
}

export function useViewPractitionerCredential() {
  return useMutation({ mutationFn: viewPractitionerCredential });
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

/**
 * Saves practitioner application draft and refetches status/readiness.
 */
export function useSaveApplicationDraft() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: saveApplicationDraft,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: practitionersQueryKeys.meApplication(),
      });
      queryClient.invalidateQueries({
        queryKey: practitionersQueryKeys.meReadiness(),
      });
    },
  });
}

/**
 * Reads persistent practitioner requirements throughout lifecycle.
 */
export function usePractitionerRequirements(enabled = true) {
  return useQuery({
    queryKey: practitionersQueryKeys.meRequirements(),
    queryFn: getPractitionerRequirements,
    enabled,
    staleTime: 30_000,
    gcTime: 10 * 60_000,
  });
}
