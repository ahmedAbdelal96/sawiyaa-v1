import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthenticatedQueryEnabled } from "../../auth/query-auth";
import { patientJourneyQueryKey } from "../journey/hooks";
import {
  cancelPatientSession,
  createScheduledSession,
  getPatientSession,
  getPatientSessionCancellationPreview,
  getPatientSessions,
  getPublicAvailabilityWindows,
  resolvePatientSessionJoinContract,
} from "./api";
import type { ListSessionsQuery } from "./types";

const patientSessionsQueryKeys = {
  all: ["patient-sessions"] as const,
  list: (query?: ListSessionsQuery) =>
    [...patientSessionsQueryKeys.all, "list", query ?? {}] as const,
  details: (sessionId: string) =>
    [...patientSessionsQueryKeys.all, "details", sessionId] as const,
  cancelPreview: (sessionId: string) =>
    [...patientSessionsQueryKeys.all, "cancel-preview", sessionId] as const,
  availabilityWindows: (slug: string, from: string, to: string) =>
    [...patientSessionsQueryKeys.all, "availability", slug, from, to] as const,
};

export function usePublicAvailabilityWindows(
  slug: string | null,
  from: string,
  to: string,
) {
  return useQuery({
    queryKey: patientSessionsQueryKeys.availabilityWindows(
      slug ?? "",
      from,
      to,
    ),
    queryFn: () => getPublicAvailabilityWindows(slug!, from, to),
    enabled: Boolean(slug),
    staleTime: 60_000,
  });
}

export function useCreateScheduledSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createScheduledSession,
    onSuccess: (payload) => {
      queryClient.invalidateQueries({ queryKey: patientSessionsQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: patientJourneyQueryKey });
      queryClient.setQueryData(
        patientSessionsQueryKeys.details(payload.item.id),
        payload.item,
      );
    },
  });
}

export function usePatientSessions(query?: ListSessionsQuery) {
  const enabled = useAuthenticatedQueryEnabled("patient");

  return useQuery({
    queryKey: patientSessionsQueryKeys.list(query),
    queryFn: () => getPatientSessions(query),
    enabled,
    staleTime: 30_000,
  });
}

export function usePatientSession(sessionId: string | null) {
  const enabled = useAuthenticatedQueryEnabled("patient");

  return useQuery({
    queryKey: patientSessionsQueryKeys.details(sessionId ?? ""),
    queryFn: async () => {
      const response = await getPatientSession(sessionId!);
      return response.item;
    },
    enabled: enabled && Boolean(sessionId),
    staleTime: 30_000,
  });
}

export function usePatientSessionCancellationPreview(sessionId: string | null) {
  const enabled = useAuthenticatedQueryEnabled("patient");

  return useQuery({
    queryKey: patientSessionsQueryKeys.cancelPreview(sessionId ?? ""),
    queryFn: async () => {
      const response = await getPatientSessionCancellationPreview(sessionId!);
      return response.item;
    },
    enabled: enabled && Boolean(sessionId),
    staleTime: 30_000,
  });
}

export function useCancelPatientSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      sessionId,
      reason,
    }: {
      sessionId: string;
      reason?: string;
    }) => cancelPatientSession(sessionId, reason),
    onSuccess: (payload) => {
      queryClient.invalidateQueries({ queryKey: patientSessionsQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: patientJourneyQueryKey });
      queryClient.setQueryData(
        patientSessionsQueryKeys.details(payload.item.id),
        payload.item,
      );
    },
  });
}

export function useResolvePatientSessionJoinContract() {
  return useMutation({
    mutationFn: (sessionId: string) =>
      resolvePatientSessionJoinContract(sessionId),
  });
}

export { patientSessionsQueryKeys };
