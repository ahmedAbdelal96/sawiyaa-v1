import { useEffect, useRef } from "react";
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

/**
 * Keeps the practitioner's live presence fresh while the web app is active.
 * It only runs for visible, authenticated practitioner surfaces.
 */
export function usePractitionerPresenceHeartbeat(enabled = true) {
  const heartbeat = useHeartbeatPresence();
  const inFlightRef = useRef(false);
  const heartbeatRef = useRef(heartbeat.mutateAsync);

  useEffect(() => {
    heartbeatRef.current = heartbeat.mutateAsync;
  }, [heartbeat.mutateAsync]);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") {
      return;
    }

    const HEARTBEAT_INTERVAL_MS = 60_000;

    const sendHeartbeat = async () => {
      if (
        inFlightRef.current ||
        document.visibilityState !== "visible"
      ) {
        return;
      }

      inFlightRef.current = true;
      try {
        await heartbeatRef.current();
      } finally {
        inFlightRef.current = false;
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void sendHeartbeat();
      }
    };

    const onWindowFocus = () => {
      void sendHeartbeat();
    };

    void sendHeartbeat();

    const intervalId = window.setInterval(() => {
      void sendHeartbeat();
    }, HEARTBEAT_INTERVAL_MS);

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("focus", onWindowFocus);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("focus", onWindowFocus);
    };
  }, [enabled]);
}
