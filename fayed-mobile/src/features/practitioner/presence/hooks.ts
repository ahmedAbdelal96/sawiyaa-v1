import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthenticatedQueryEnabled } from "../../auth/query-auth";
import { getMyPresence, setMyInstantBooking, setMyPresenceStatus } from "./api";
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
