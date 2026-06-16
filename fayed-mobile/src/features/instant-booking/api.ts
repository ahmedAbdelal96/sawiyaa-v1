import { apiClient, extractApiData } from "../../lib/api";
import type {
  CreatePatientInstantBookingRequestInput,
  InstantBookingDiscoveryCurrency,
  InstantBookingDiscoveryDuration,
  InstantBookingEligiblePractitionersResponse,
  InstantBookingRequestResponse,
  InstantBookingRequestsResponse,
} from "./types";

export interface PatientInstantBookingPractitionersParams {
  duration?: InstantBookingDiscoveryDuration;
  currency?: InstantBookingDiscoveryCurrency;
  page?: number;
  limit?: number;
}

export async function getPatientInstantBookingPractitioners(
  params?: PatientInstantBookingPractitionersParams,
) {
  const response = await apiClient.get("/patients/me/instant-booking/practitioners", {
    params,
  });

  return extractApiData<InstantBookingEligiblePractitionersResponse>(response);
}

export async function createPatientInstantBookingRequest(
  input: CreatePatientInstantBookingRequestInput,
) {
  const response = await apiClient.post("/patients/me/instant-booking-requests", input);
  return extractApiData<InstantBookingRequestResponse>(response);
}

export async function getPatientInstantBookingRequest(requestId: string) {
  const response = await apiClient.get(`/patients/me/instant-booking-requests/${requestId}`);
  return extractApiData<InstantBookingRequestResponse>(response);
}

export async function listPatientInstantBookingRequests() {
  const response = await apiClient.get("/patients/me/instant-booking-requests");
  return extractApiData<InstantBookingRequestsResponse>(response);
}

export async function cancelPatientInstantBookingRequest(
  requestId: string,
  reason?: string,
) {
  const response = await apiClient.post(
    `/patients/me/instant-booking-requests/${requestId}/cancel`,
    reason ? { reason } : {},
  );

  return extractApiData<InstantBookingRequestResponse>(response);
}

export async function getPractitionerPendingBookingRequests() {
  const response = await apiClient.get("/practitioners/me/instant-booking-requests/pending");
  return extractApiData<InstantBookingRequestsResponse>(response);
}

export async function listPractitionerInstantBookingRequests() {
  const response = await apiClient.get("/practitioners/me/instant-booking-requests");
  return extractApiData<InstantBookingRequestsResponse>(response);
}

export async function acceptInstantBookingRequest(requestId: string) {
  const response = await apiClient.post(
    `/practitioners/me/instant-booking-requests/${requestId}/accept`,
  );

  return extractApiData<InstantBookingRequestResponse>(response);
}

export async function rejectInstantBookingRequest(
  requestId: string,
  reason?: string,
) {
  const response = await apiClient.post(
    `/practitioners/me/instant-booking-requests/${requestId}/reject`,
    reason ? { reason } : {},
  );

  return extractApiData<InstantBookingRequestResponse>(response);
}

