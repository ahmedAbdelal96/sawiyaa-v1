import type { ListAdminReviewsParams, ListPatientReviewsParams } from "../types/reviews.types";

export const adminReviewsQueryKeys = {
  all: ["admin-reviews"] as const,
  reviews: () => [...adminReviewsQueryKeys.all, "list"] as const,
  reviewsList: (params: ListAdminReviewsParams = {}) =>
    [...adminReviewsQueryKeys.reviews(), params] as const,
  review: (reviewId: string) =>
    [...adminReviewsQueryKeys.all, "detail", reviewId] as const,
};

export const patientReviewsQueryKeys = {
  all: ["patient-reviews"] as const,
  reviews: () => [...patientReviewsQueryKeys.all, "list"] as const,
  reviewsList: (params: ListPatientReviewsParams = {}) =>
    [...patientReviewsQueryKeys.reviews(), params] as const,
  review: (reviewId: string) =>
    [...patientReviewsQueryKeys.all, "detail", reviewId] as const,
};
