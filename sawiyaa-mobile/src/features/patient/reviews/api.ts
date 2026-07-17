import { apiClient, extractApiData } from "../../../lib/api";
import type {
  CreateSessionReviewInput,
  PendingPatientReviewsResponse,
  PatientReviewItem,
} from "./types";

export async function getPendingPatientReviews(limit = 3) {
  const response = await apiClient.get(
    "/patients/me/reviews/pending",
    { params: { page: 1, limit } },
  );
  return extractApiData<PendingPatientReviewsResponse>(response);
}

export async function submitPatientSessionReview(
  sessionId: string,
  payload: CreateSessionReviewInput,
) {
  const response = await apiClient.post(
    `/patients/me/sessions/${sessionId}/review`,
    payload,
  );
  return extractApiData<{ item: PatientReviewItem["item"] }>(response);
}
