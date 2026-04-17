import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getAdminReview,
  getAdminReviews,
  getPatientReview,
  getPatientReviews,
  moderateReview,
} from "../api/reviews.api";
import { adminReviewsQueryKeys, patientReviewsQueryKeys } from "../constants/query-keys";
import type {
  ListAdminReviewsParams,
  ListPatientReviewsParams,
  ModerateReviewRequest,
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

export function usePatientReviews(params: ListPatientReviewsParams = {}) {
  return useQuery({
    queryKey: patientReviewsQueryKeys.reviewsList(params),
    queryFn: () => getPatientReviews(params),
    staleTime: 60_000,
  });
}

export function usePatientReview(reviewId: string | null) {
  return useQuery({
    queryKey: patientReviewsQueryKeys.review(reviewId ?? ""),
    queryFn: () => getPatientReview(reviewId!),
    enabled: Boolean(reviewId),
    staleTime: 30_000,
  });
}
