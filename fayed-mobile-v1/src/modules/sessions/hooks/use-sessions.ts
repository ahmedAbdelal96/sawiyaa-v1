import { useMutation, useQuery } from "@tanstack/react-query";

import { sessionsService } from "@/modules/sessions/application/sessions.service";
import { queryClient } from "@/networking/query/query-client";

export function useMySessions(status?: string) {
  return useQuery({
    queryKey: ["sessions", "patient", status || "all"],
    queryFn: () => sessionsService.listMySessions(status),
  });
}

export function useSessionDetails(sessionId: string) {
  return useQuery({
    enabled: Boolean(sessionId),
    queryKey: ["session", sessionId],
    queryFn: () => sessionsService.getSessionDetails(sessionId),
  });
}

export function useCancelSession(sessionId: string) {
  return useMutation({
    mutationFn: (reason?: string) => sessionsService.cancelSession(sessionId, reason),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["sessions", "patient"] }),
        queryClient.invalidateQueries({ queryKey: ["session", sessionId] }),
        queryClient.invalidateQueries({ queryKey: ["journey", "summary"] }),
      ]);
    },
  });
}

export function usePrepareRuntime(sessionId: string) {
  return useMutation({
    mutationFn: () => sessionsService.prepareRuntime(sessionId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["session-join", sessionId] });
    },
  });
}

export function useSessionJoinContract(sessionId: string) {
  return useQuery({
    enabled: Boolean(sessionId),
    queryKey: ["session-join", sessionId],
    queryFn: () => sessionsService.resolveJoin(sessionId),
  });
}
