import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { patientJourneyQueryKeys } from "@/features/patient-journey/constants/query-keys";
import {
  acceptInstantBookingRequest,
  cancelPatientInstantBookingRequest,
  createPatientInstantBookingRequest,
  getPatientInstantBookingPractitioners,
  getPatientInstantBookingRequest,
  getPractitionerPendingBookingRequests,
  listPatientInstantBookingRequests,
  listPractitionerInstantBookingRequests,
  rejectInstantBookingRequest,
  type PatientInstantBookingPractitionersParams,
} from "../api/instant-booking.api";
import type {
  CreatePatientInstantBookingRequestInput,
  InstantBookingRequest,
} from "../types/instant-booking.types";

export const instantBookingQueryKeys = {
  all: ["instant-booking"] as const,
  patient: () => [...instantBookingQueryKeys.all, "patient"] as const,
  patientPractitioners: (params?: PatientInstantBookingPractitionersParams) =>
    [...instantBookingQueryKeys.patient(), "practitioners", params ?? {}] as const,
  patientRequests: () => [...instantBookingQueryKeys.patient(), "requests"] as const,
  patientRequest: (requestId: string) =>
    [...instantBookingQueryKeys.patient(), "request", requestId] as const,
  practitioner: () => [...instantBookingQueryKeys.all, "practitioner"] as const,
  pendingList: () => [...instantBookingQueryKeys.practitioner(), "pending"] as const,
  queueList: () => [...instantBookingQueryKeys.practitioner(), "queue"] as const,
};

/**
 * Fetches the current patient-facing instant-booking discovery list.
 */
export function usePatientInstantBookingPractitioners(
  params?: PatientInstantBookingPractitionersParams,
) {
  return useQuery({
    queryKey: instantBookingQueryKeys.patientPractitioners(params),
    queryFn: () => getPatientInstantBookingPractitioners(params),
    staleTime: 15_000,
  });
}

/**
 * Fetches the current patient's instant-booking requests.
 */
export function usePatientInstantBookingRequests() {
  return useQuery({
    queryKey: instantBookingQueryKeys.patientRequests(),
    queryFn: listPatientInstantBookingRequests,
    staleTime: 15_000,
  });
}

/**
 * Fetches a single patient instant-booking request and keeps it fresh while pending.
 */
export function usePatientInstantBookingRequest(requestId: string | null) {
  return useQuery({
    queryKey: instantBookingQueryKeys.patientRequest(requestId ?? ""),
    queryFn: () => getPatientInstantBookingRequest(requestId!),
    enabled: Boolean(requestId),
    staleTime: 0,
    refetchInterval: (query) => {
      const request = query.state.data as InstantBookingRequest | undefined;
      if (!request || request.status !== "PENDING") {
        return false;
      }

      if (new Date(request.expiresAt).getTime() <= Date.now()) {
        return false;
      }

      return 3_000;
    },
    refetchIntervalInBackground: false,
  });
}

/**
 * Creates a patient instant-booking request.
 */
export function useCreatePatientInstantBookingRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreatePatientInstantBookingRequestInput) =>
      createPatientInstantBookingRequest(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: instantBookingQueryKeys.patient() });
      queryClient.invalidateQueries({ queryKey: patientJourneyQueryKeys.me() });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: instantBookingQueryKeys.patientRequests() });
    },
  });
}

/**
 * Cancels a patient-owned instant-booking request.
 */
export function useCancelPatientInstantBookingRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ requestId, reason }: { requestId: string; reason?: string }) =>
      cancelPatientInstantBookingRequest(requestId, reason),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: instantBookingQueryKeys.patientRequest(variables.requestId),
      });
      queryClient.invalidateQueries({ queryKey: instantBookingQueryKeys.patientRequests() });
      queryClient.invalidateQueries({ queryKey: patientJourneyQueryKeys.me() });
    },
  });
}

/**
 * Lists the practitioner's pending instant booking requests.
 */
export function usePractitionerPendingBookingRequests() {
  return useQuery({
    queryKey: instantBookingQueryKeys.pendingList(),
    queryFn: getPractitionerPendingBookingRequests,
    staleTime: 15_000,
    refetchInterval: (query) => {
      const requests = query.state.data as InstantBookingRequest[] | undefined;
      if (!requests || requests.length === 0) {
        return false;
      }

      return requests.some((request) => request.status === "PENDING") ? 4_000 : false;
    },
    refetchIntervalInBackground: false,
  });
}

/**
 * Lists the practitioner's instant booking queue, including recent terminal states.
 */
export function usePractitionerInstantBookingRequests() {
  return useQuery({
    queryKey: instantBookingQueryKeys.queueList(),
    queryFn: listPractitionerInstantBookingRequests,
    staleTime: 10_000,
    refetchInterval: (query) => {
      const requests = query.state.data as InstantBookingRequest[] | undefined;
      if (!requests || requests.length === 0) {
        return false;
      }

      return requests.some((request) => request.status === "PENDING") ? 4_000 : false;
    },
    refetchIntervalInBackground: false,
  });
}

/**
 * Accepts a pending instant booking request.
 * Invalidates the pending list after success (request moves to ACCEPTED).
 */
export function useAcceptInstantBookingRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: acceptInstantBookingRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: instantBookingQueryKeys.all });
    },
  });
}

/**
 * Rejects a pending instant booking request.
 * Invalidates the pending list after success.
 */
export function useRejectInstantBookingRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      requestId,
      reason,
    }: {
      requestId: string;
      reason?: string;
    }) => rejectInstantBookingRequest(requestId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: instantBookingQueryKeys.all });
    },
  });
}
