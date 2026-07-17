import type { ListAdminSessionEarningReviewsParams } from "../types/admin-session-earning-reviews.types";

export const adminSessionEarningReviewsQueryKeys = {
  all: ["admin-session-earning-reviews"] as const,
  list: (params: ListAdminSessionEarningReviewsParams = {}) =>
    [...adminSessionEarningReviewsQueryKeys.all, "list", params] as const,
  detail: (reviewId: string) =>
    [...adminSessionEarningReviewsQueryKeys.all, "detail", reviewId] as const,
};
