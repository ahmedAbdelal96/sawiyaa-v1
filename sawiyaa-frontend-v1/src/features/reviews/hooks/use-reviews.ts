import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getAdminReview,
  getAdminReviews,
  getPendingPatientReviews,
  getPatientReview,
  getPatientReviews,
  moderateReview,
  submitPatientSessionReview,
} from "../api/reviews.api";
import { adminReviewsQueryKeys, patientReviewsQueryKeys } from "../constants/query-keys";
import {
  patientSessionQueryKeys,
  patientSessionSummaryQueryKeys,
} from "@/features/sessions/hooks/use-sessions";
import type {
  CreateSessionReviewInput,
  ListAdminReviewsParams,
  ListPendingPatientReviewsParams,
  ListPatientReviewsParams,
  ModerateReviewRequest,
  PatientReviewItemData,
} from "../types/reviews.types";

export function useAdminReviews(params: ListAdminReviewsParams = {}) {
  return useQuery({
    queryKey: adminReviewsQueryKeys.reviewsList(params),
    queryFn: () => getAdminReviews(params),
    staleTime: 60_000,
  });
}

export function useAdminReview(reviewId: string | null) {
  return useQuery({
    queryKey: adminReviewsQueryKeys.review(reviewId ?? ""),
    queryFn: () => getAdminReview(reviewId!),
    enabled: Boolean(reviewId),
    staleTime: 30_000,
  });
}

export function useModerateReview(reviewId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ModerateReviewRequest) => moderateReview(reviewId, payload),
    onSuccess: (data) => {
      queryClient.setQueryData(adminReviewsQueryKeys.review(reviewId), {
        item: data.item,
      });
      queryClient.invalidateQueries({
        queryKey: adminReviewsQueryKeys.reviews(),
      });
    },
  });
}

export function usePatientReviews(
  params: ListPatientReviewsParams = {},
  enabled = true,
) {
  return useQuery({
    queryKey: patientReviewsQueryKeys.reviewsList(params),
    queryFn: () => getPatientReviews(params),
    enabled,
    staleTime: 60_000,
  });
}

export function usePatientReview(reviewId: string | null, enabled = true) {
  return useQuery({
    queryKey: patientReviewsQueryKeys.review(reviewId ?? ""),
    queryFn: () => getPatientReview(reviewId!),
    enabled: Boolean(reviewId) && enabled,
    staleTime: 30_000,
  });
}

export function usePendingPatientReviews(
  params: ListPendingPatientReviewsParams = {},
  enabled = true,
) {
  return useQuery({
    queryKey: patientReviewsQueryKeys.pendingReviews(params),
    queryFn: () => getPendingPatientReviews(params),
    enabled,
    staleTime: 30_000,
  });
}

export function useSubmitPatientSessionReview(sessionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateSessionReviewInput) =>
      submitPatientSessionReview(sessionId, payload),
    onSuccess: (data: PatientReviewItemData) => {
      queryClient.setQueryData(patientReviewsQueryKeys.review(data.item.id), data);
      queryClient.invalidateQueries({
        queryKey: patientReviewsQueryKeys.all,
      });
      queryClient.invalidateQueries({
        queryKey: patientSessionQueryKeys.all,
      });
      queryClient.invalidateQueries({
        queryKey: patientSessionSummaryQueryKeys.all,
      });
    },
  });
}
