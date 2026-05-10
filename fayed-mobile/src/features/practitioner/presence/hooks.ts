import { useEffect, useRef } from "react";
import { AppState } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthenticatedQueryEnabled } from "../../auth/query-auth";
import {
  getMyPresence,
  heartbeatMyPresence,
  setMyInstantBooking,
  setMyPresenceStatus,
} from "./api";
import type {
  SetInstantBookingPayload,
  SetPresenceStatusPayload,
} from "./types";

export const practitionerPresenceQueryKeys = {
  all: ["practitioner-presence"] as const,
  me: () => [...practitionerPresenceQueryKeys.all, "me"] as const,
};

export function useMyPresence(enabled = true) {
  const authEnabled = useAuthenticatedQueryEnabled("practitioner");

  return useQuery({
    queryKey: practitionerPresenceQueryKeys.me(),
    queryFn: getMyPresence,
    enabled: enabled && authEnabled,
    staleTime: 30_000,
  });
}

export function useSetPresenceStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: SetPresenceStatusPayload) =>
      setMyPresenceStatus(payload),
    onSuccess: (data) => {
      queryClient.setQueryData(practitionerPresenceQueryKeys.me(), data);
    },
  });
}

export function useSetInstantBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: SetInstantBookingPayload) =>
      setMyInstantBooking(payload),
    onSuccess: (data) => {
      queryClient.setQueryData(practitionerPresenceQueryKeys.me(), data);
    },
  });
}

export function useHeartbeatPresence() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: heartbeatMyPresence,
    onSuccess: (data) => {
      queryClient.setQueryData(practitionerPresenceQueryKeys.me(), data);
    },
  });
}

export function usePractitionerPresenceHeartbeat(enabled = true) {
  const heartbeat = useHeartbeatPresence();
  const inFlightRef = useRef(false);
  const heartbeatRef = useRef(heartbeat.mutateAsync);
  const appStateRef = useRef(AppState.currentState);

  useEffect(() => {
    heartbeatRef.current = heartbeat.mutateAsync;
  }, [heartbeat.mutateAsync]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const HEARTBEAT_INTERVAL_MS = 60_000;

    const sendHeartbeat = async () => {
      if (inFlightRef.current || appStateRef.current !== "active") {
        return;
      }

      inFlightRef.current = true;
      try {
        await heartbeatRef.current();
      } finally {
        inFlightRef.current = false;
      }
    };

    const subscription = AppState.addEventListener("change", (nextState) => {
      appStateRef.current = nextState;
      if (nextState === "active") {
        void sendHeartbeat();
      }
    });

    void sendHeartbeat();

    const intervalId = setInterval(() => {
      if (appStateRef.current === "active") {
        void sendHeartbeat();
      }
    }, HEARTBEAT_INTERVAL_MS);

    return () => {
      subscription.remove();
      clearInterval(intervalId);
    };
  }, [enabled]);
}
