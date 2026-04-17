import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getMyPresence,
  heartbeatMyPresence,
  setMyInstantBooking,
  setMyPresenceStatus,
} from "../api/presence.api";
import { presenceQueryKeys } from "../constants/query-keys";

/**
 * Reads the practitioner's current presence state.
 */
export function useMyPresence(enabled = true) {
  return useQuery({
    queryKey: presenceQueryKeys.me(),
    queryFn: getMyPresence,
    enabled,
    staleTime: 15_000,
    gcTime: 5 * 60_000,
  });
}

/**
 * Sets the manual presence status and updates the local cache immediately.
 */
export function useSetPresenceStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: setMyPresenceStatus,
    onSuccess: (data) => {
      queryClient.setQueryData(presenceQueryKeys.me(), data);
    },
  });
}

/**
 * Toggles instant booking readiness and updates the local cache immediately.
 */
export function useSetInstantBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: setMyInstantBooking,
    onSuccess: (data) => {
      queryClient.setQueryData(presenceQueryKeys.me(), data);
    },
  });
}

/**
 * Fires a heartbeat to keep presence fresh.
 * Used on dashboard mount — does not change displayed status.
 */
export function useHeartbeatPresence() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: heartbeatMyPresence,
    onSuccess: (data) => {
      queryClient.setQueryData(presenceQueryKeys.me(), data);
    },
  });
}
