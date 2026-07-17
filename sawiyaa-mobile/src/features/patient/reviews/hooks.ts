import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getPendingPatientReviews, submitPatientSessionReview } from "./api";
import type { CreateSessionReviewInput } from "./types";

export const patientReviewQueryKeys = {
  all: ["patient-reviews"] as const,
  pending: () => [...patientReviewQueryKeys.all, "pending"] as const,
};

export function usePendingPatientReviews(limit = 3, enabled = true) {
  return useQuery({
    queryKey: patientReviewQueryKeys.pending(),
    queryFn: () => getPendingPatientReviews(limit),
    enabled,
    staleTime: 30_000,
  });
}

export function useSubmitPatientSessionReview(sessionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateSessionReviewInput) =>
      submitPatientSessionReview(sessionId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: patientReviewQueryKeys.all });
    },
  });
}
