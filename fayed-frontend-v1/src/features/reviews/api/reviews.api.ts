import httpClient from "@/lib/api/http-client";
import type { ApiPayload } from "@/lib/api/contracts";
import { extractData } from "@/lib/api/response";
import type {
  AdminReviewItemData,
  AdminReviewsListData,
  ListAdminReviewsParams,
  ListPatientReviewsParams,
  ModerationResultData,
  ModerateReviewRequest,
  PatientReviewItemData,
  PatientReviewsListData,
} from "../types/reviews.types";

export async function getAdminReviews(
  params: ListAdminReviewsParams = {},
): Promise<AdminReviewsListData> {
  const response = await httpClient.get<ApiPayload<AdminReviewsListData>>("/admin/reviews", {
    params: {
      page: params.page,
      limit: params.limit,
      status: params.status,
      practitionerId: params.practitionerId,
      sessionId: params.sessionId,
      needsModeration: params.needsModeration,
    },
  });
  return extractData(response.data);
}

export async function getAdminReview(reviewId: string): Promise<AdminReviewItemData> {
  const response = await httpClient.get<ApiPayload<AdminReviewItemData>>(
    `/admin/reviews/${reviewId}`,
  );
  return extractData(response.data);
}

export async function moderateReview(
  reviewId: string,
  payload: ModerateReviewRequest,
): Promise<ModerationResultData> {
  const response = await httpClient.patch<ApiPayload<ModerationResultData>>(
    `/admin/reviews/${reviewId}/moderation`,
    payload,
  );
  return extractData(response.data);
}

export async function getPatientReviews(
  params: ListPatientReviewsParams = {},
): Promise<PatientReviewsListData> {
  const response = await httpClient.get<ApiPayload<PatientReviewsListData>>("/patients/me/reviews", {
    params: {
      page: params.page,
      limit: params.limit,
      status: params.status,
    },
  });
  return extractData(response.data);
}

export async function getPatientReview(reviewId: string): Promise<PatientReviewItemData> {
  const response = await httpClient.get<ApiPayload<PatientReviewItemData>>(
    `/patients/me/reviews/${reviewId}`,
  );
  return extractData(response.data);
}
