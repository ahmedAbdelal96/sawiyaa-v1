import httpClient from "@/lib/api/http-client";
import { extractData } from "@/lib/api/response";
import type { ApiPayload } from "@/lib/api/contracts";
import type {
  InstantBookingRequest,
  InstantBookingRequestResponseData,
  InstantBookingRequestsListResponseData,
} from "../types/instant-booking.types";

/**
 * Lists pending instant booking requests assigned to the authenticated practitioner.
 * Only returns requests that are still PENDING and not yet expired.
 *
 * GET /practitioners/me/instant-booking-requests/pending
 */
export async function getPractitionerPendingBookingRequests(): Promise<
  InstantBookingRequest[]
> {
  const response = await httpClient.get<
    ApiPayload<InstantBookingRequestsListResponseData>
  >("/practitioners/me/instant-booking-requests/pending");
  return extractData(response.data).items;
}

/**
 * Accepts a pending instant booking request.
 * Re-validates practitioner live eligibility and conflict-checks before creating the session.
 * Returns the updated instant booking request with createdSessionId populated.
 *
 * POST /practitioners/me/instant-booking-requests/:requestId/accept
 *
 * Error codes:
 *   - 400: practitioner is no longer online/eligible or availability no longer fits
 *   - 404: request not found or not owned by this practitioner
 *   - 409: request is expired, already finalized, or a session conflict emerged
 */
export async function acceptInstantBookingRequest(
  requestId: string,
): Promise<InstantBookingRequest> {
  const response = await httpClient.post<
    ApiPayload<InstantBookingRequestResponseData>
  >(`/practitioners/me/instant-booking-requests/${requestId}/accept`);
  return extractData(response.data).item;
}

/**
 * Rejects a pending instant booking request. Reason is optional.
 *
 * POST /practitioners/me/instant-booking-requests/:requestId/reject
 *
 * Error codes:
 *   - 404: request not found or not owned by this practitioner
 *   - 409: request is expired or already finalized
 */
export async function rejectInstantBookingRequest(
  requestId: string,
  reason?: string,
): Promise<InstantBookingRequest> {
  const response = await httpClient.post<
    ApiPayload<InstantBookingRequestResponseData>
  >(
    `/practitioners/me/instant-booking-requests/${requestId}/reject`,
    reason ? { reason } : {},
  );
  return extractData(response.data).item;
}
