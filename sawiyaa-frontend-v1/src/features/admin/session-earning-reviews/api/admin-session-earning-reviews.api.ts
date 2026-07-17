import httpClient from "@/lib/api/http-client";
import { extractData } from "@/lib/api/response";
import type { ApiPayload } from "@/lib/api/contracts";
import type {
  AdminSessionEarningReviewDetailData,
  AdminSessionEarningReviewsListData,
  ListAdminSessionEarningReviewsParams,
  ModerateAdminSessionEarningReviewPayload,
  ModerateAdminSessionEarningReviewResult,
} from "../types/admin-session-earning-reviews.types";

export async function listAdminSessionEarningReviews(
  params: ListAdminSessionEarningReviewsParams,
) {
  const response = await httpClient.get<ApiPayload<AdminSessionEarningReviewsListData>>(
    "/admin/finance/session-earning-reviews",
    { params },
  );

  return extractData(response.data);
}

export async function getAdminSessionEarningReview(reviewId: string) {
  const response = await httpClient.get<ApiPayload<AdminSessionEarningReviewDetailData>>(
    `/admin/finance/session-earning-reviews/${reviewId}`,
  );

  return extractData(response.data);
}

export async function moderateAdminSessionEarningReview(
  reviewId: string,
  payload: ModerateAdminSessionEarningReviewPayload,
) {
  const response = await httpClient.patch<ApiPayload<ModerateAdminSessionEarningReviewResult>>(
    `/admin/finance/session-earning-reviews/${reviewId}/moderation`,
    payload,
  );

  return extractData(response.data);
}
