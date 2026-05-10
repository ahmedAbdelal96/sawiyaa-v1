import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthenticatedQueryEnabled } from "../../auth/query-auth";
import { practitionerProfileQueryKeys } from "../profile/hooks";
import {
  getPractitionerCredentials,
  getPractitionerSpecialties,
  getSpecialtyCatalog,
  submitPractitionerApplication,
  updatePractitionerSpecialties,
  uploadPractitionerCredential,
} from "./api";
import type {
  SubmitPractitionerApplicationRequest,
  UpdatePractitionerSpecialtiesRequest,
  UploadPractitionerCredentialRequest,
} from "./types";

export const practitionerOnboardingQueryKeys = {
  all: ["practitioner-onboarding"] as const,
  specialties: () => [...practitionerOnboardingQueryKeys.all, "specialties"] as const,
  credentials: () => [...practitionerOnboardingQueryKeys.all, "credentials"] as const,
  catalog: () => [...practitionerOnboardingQueryKeys.all, "catalog"] as const,
};

export function usePractitionerOnboardingSpecialties(enabled = true) {
  const authEnabled = useAuthenticatedQueryEnabled("practitioner");

  return useQuery({
    queryKey: practitionerOnboardingQueryKeys.specialties(),
    queryFn: getPractitionerSpecialties,
    enabled: enabled && authEnabled,
    staleTime: 30_000,
  });
}

export function usePractitionerOnboardingCredentials(enabled = true) {
  const authEnabled = useAuthenticatedQueryEnabled("practitioner");

  return useQuery({
    queryKey: practitionerOnboardingQueryKeys.credentials(),
    queryFn: getPractitionerCredentials,
    enabled: enabled && authEnabled,
    staleTime: 30_000,
  });
}

export function usePractitionerSpecialtyCatalog(enabled = true) {
  const authEnabled = useAuthenticatedQueryEnabled("practitioner");

  return useQuery({
    queryKey: practitionerOnboardingQueryKeys.catalog(),
    queryFn: getSpecialtyCatalog,
    enabled: enabled && authEnabled,
    staleTime: 60_000,
  });
}

export function useUpdatePractitionerSpecialties() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdatePractitionerSpecialtiesRequest) =>
      updatePractitionerSpecialties(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: practitionerOnboardingQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: practitionerProfileQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: ["practitioner-session-workspace"] });
      queryClient.invalidateQueries({ queryKey: ["auth"] });
    },
  });
}

export function useUploadPractitionerCredential() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UploadPractitionerCredentialRequest) =>
      uploadPractitionerCredential(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: practitionerOnboardingQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: practitionerProfileQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: ["auth"] });
    },
  });
}

export function useSubmitPractitionerApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: SubmitPractitionerApplicationRequest) =>
      submitPractitionerApplication(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: practitionerOnboardingQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: practitionerProfileQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: ["auth"] });
    },
  });
}
