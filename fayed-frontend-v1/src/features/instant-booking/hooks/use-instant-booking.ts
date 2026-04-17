import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  acceptInstantBookingRequest,
  getPractitionerPendingBookingRequests,
  rejectInstantBookingRequest,
} from "../api/instant-booking.api";

export const instantBookingQueryKeys = {
  all: ["instant-booking"] as const,
  pendingList: () => [...instantBookingQueryKeys.all, "pending"] as const,
};

/**
 * Fetches the practitioner's pending instant booking requests.
 * Short stale time since requests expire quickly.
 */
export function usePractitionerPendingBookingRequests() {
  return useQuery({
    queryKey: instantBookingQueryKeys.pendingList(),
    queryFn: getPractitionerPendingBookingRequests,
    staleTime: 15_000,
    refetchInterval: 30_000,
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
