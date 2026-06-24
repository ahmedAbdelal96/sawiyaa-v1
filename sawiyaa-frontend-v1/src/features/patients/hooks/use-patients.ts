import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getPatientProfile,
  removePatientAvatar,
  updatePatientProfile,
  uploadPatientAvatar,
} from "../api/patients.api";
import { patientsQueryKeys } from "../constants/query-keys";
import { paymentQueryKeys } from "@/features/payments/hooks/use-payments";
import { packagePlanQueryKeys } from "@/features/package-plans/hooks/use-package-plans";
import { packagePurchaseQueryKeys } from "@/features/package-plans/hooks/use-package-purchases";
import { academyQueryKeys } from "@/features/academy/hooks/use-academy";

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
      queryClient.invalidateQueries({ queryKey: paymentQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: packagePurchaseQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: packagePlanQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: academyQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: ["session-financial"] });
      queryClient.invalidateQueries({ queryKey: ["public-practitioners"] });
      queryClient.invalidateQueries({ queryKey: ["public-practitioner"] });
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
