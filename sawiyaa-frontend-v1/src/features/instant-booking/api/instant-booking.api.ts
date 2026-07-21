import httpClient from "@/lib/api/http-client";
import { extractData } from "@/lib/api/response";
import type { ApiPayload } from "@/lib/api/contracts";
import type {
  CreatePatientInstantBookingRequestInput,
  InstantBookingDiscoveryCurrency,
  InstantBookingDiscoveryDuration,
  InstantBookingEligiblePractitionersResponseData,
  InstantBookingRequest,
  InstantBookingRequestResponseData,
  InstantBookingRequestsListResponseData,
} from "../types/instant-booking.types";

export type PatientInstantBookingPractitionersParams = {
  duration?: InstantBookingDiscoveryDuration;
  page?: number;
  limit?: number;
};

/**
 * Lists the practitioners currently eligible for instant booking.
 *
 * GET /patients/me/instant-booking/practitioners
 */
export async function getPatientInstantBookingPractitioners(
  params?: PatientInstantBookingPractitionersParams,
): Promise<InstantBookingEligiblePractitionersResponseData> {
  const response = await httpClient.get<ApiPayload<InstantBookingEligiblePractitionersResponseData>>(
    "/patients/me/instant-booking/practitioners",
    {
      params: {
        duration: params?.duration,
        page: params?.page ?? 1,
        limit: params?.limit ?? 30,
      },
    },
  );

  return extractData(response.data);
}

/**
 * Creates a patient instant-booking request for a selected practitioner/duration.
 *
 * POST /patients/me/instant-booking-requests
 */
export async function createPatientInstantBookingRequest(
  input: CreatePatientInstantBookingRequestInput,
): Promise<InstantBookingRequest> {
  const response = await httpClient.post<ApiPayload<InstantBookingRequestResponseData>>(
    "/patients/me/instant-booking-requests",
    input,
  );

  return extractData(response.data).item;
}

/**
 * Returns a single patient instant-booking request.
 *
 * GET /patients/me/instant-booking-requests/:id
 */
export async function getPatientInstantBookingRequest(
  requestId: string,
): Promise<InstantBookingRequest> {
  const response = await httpClient.get<ApiPayload<InstantBookingRequestResponseData>>(
    `/patients/me/instant-booking-requests/${requestId}`,
  );

  return extractData(response.data).item;
}

/**
 * Lists the patient's instant-booking requests in reverse chronological order.
 *
 * GET /patients/me/instant-booking-requests
 */
export async function listPatientInstantBookingRequests(): Promise<InstantBookingRequest[]> {
  const response = await httpClient.get<ApiPayload<InstantBookingRequestsListResponseData>>(
    "/patients/me/instant-booking-requests",
  );

  return extractData(response.data).items;
}

/**
 * Cancels a patient-owned instant-booking request.
 *
 * POST /patients/me/instant-booking-requests/:id/cancel
 */
export async function cancelPatientInstantBookingRequest(
  requestId: string,
  reason?: string,
): Promise<InstantBookingRequest> {
  const response = await httpClient.post<ApiPayload<InstantBookingRequestResponseData>>(
    `/patients/me/instant-booking-requests/${requestId}/cancel`,
    reason ? { reason } : {},
  );

  return extractData(response.data).item;
}

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
 * Lists all instant booking requests assigned to the authenticated practitioner.
 * Returns current and recent terminal requests so the practitioner can review the queue.
 *
 * GET /practitioners/me/instant-booking-requests
 */
export async function listPractitionerInstantBookingRequests(): Promise<
  InstantBookingRequest[]
> {
  const response = await httpClient.get<
    ApiPayload<InstantBookingRequestsListResponseData>
  >("/practitioners/me/instant-booking-requests");
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
