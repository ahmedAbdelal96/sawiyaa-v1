import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthenticatedQueryEnabled } from "../auth/query-auth";
import { patientJourneyQueryKey } from "../patient/journey/hooks";
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
} from "./api";
import type { CreatePatientInstantBookingRequestInput, InstantBookingRequest } from "./types";

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

export function usePatientInstantBookingPractitioners(
  params?: PatientInstantBookingPractitionersParams,
) {
  const enabled = useAuthenticatedQueryEnabled("patient");

  return useQuery({
    queryKey: instantBookingQueryKeys.patientPractitioners(params),
    queryFn: () => getPatientInstantBookingPractitioners(params),
    enabled,
    staleTime: 15_000,
  });
}

export function usePatientInstantBookingRequests() {
  const enabled = useAuthenticatedQueryEnabled("patient");

  return useQuery({
    queryKey: instantBookingQueryKeys.patientRequests(),
    queryFn: listPatientInstantBookingRequests,
    enabled,
    staleTime: 15_000,
  });
}

export function usePatientInstantBookingRequest(requestId: string | null) {
  const enabled = useAuthenticatedQueryEnabled("patient");

  return useQuery({
    queryKey: instantBookingQueryKeys.patientRequest(requestId ?? ""),
    queryFn: () => getPatientInstantBookingRequest(requestId!),
    enabled: enabled && Boolean(requestId),
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

export function useCreatePatientInstantBookingRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreatePatientInstantBookingRequestInput) =>
      createPatientInstantBookingRequest(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: instantBookingQueryKeys.patient() });
      queryClient.invalidateQueries({ queryKey: patientJourneyQueryKey });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: instantBookingQueryKeys.patientRequests() });
    },
  });
}

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
      queryClient.invalidateQueries({ queryKey: patientJourneyQueryKey });
    },
  });
}

export function usePractitionerPendingBookingRequests() {
  const enabled = useAuthenticatedQueryEnabled("practitioner");

  return useQuery({
    queryKey: instantBookingQueryKeys.pendingList(),
    queryFn: getPractitionerPendingBookingRequests,
    enabled,
    staleTime: 15_000,
    refetchInterval: (query) => {
      const requests = (
        query.state.data as { items?: InstantBookingRequest[] } | undefined
      )?.items;
      if (!requests || requests.length === 0) {
        return false;
      }

      return requests.some((request) => request.status === "PENDING") ? 4_000 : false;
    },
    refetchIntervalInBackground: false,
  });
}

export function usePractitionerInstantBookingRequests() {
  const enabled = useAuthenticatedQueryEnabled("practitioner");

  return useQuery({
    queryKey: instantBookingQueryKeys.queueList(),
    queryFn: listPractitionerInstantBookingRequests,
    enabled,
    staleTime: 10_000,
    refetchInterval: (query) => {
      const requests = (
        query.state.data as { items?: InstantBookingRequest[] } | undefined
      )?.items;
      if (!requests || requests.length === 0) {
        return false;
      }

      return requests.some((request) => request.status === "PENDING") ? 4_000 : false;
    },
    refetchIntervalInBackground: false,
  });
}

export function useAcceptInstantBookingRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: acceptInstantBookingRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: instantBookingQueryKeys.all });
    },
  });
}

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

export function useNowTick(intervalMs = 1_000) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, intervalMs);

    return () => clearInterval(timer);
  }, [intervalMs]);

  return now;
}
