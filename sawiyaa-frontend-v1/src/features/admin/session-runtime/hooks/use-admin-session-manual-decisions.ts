"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createAdminSessionManualDecision,
  getAdminSessionManualDecisions,
} from "../api/admin-session-manual-decisions.api";
import { adminSessionRuntimeQueryKeys } from "../constants/query-keys";
import type {
  CreateAdminSessionManualDecisionRequest,
  AdminSessionDecisionItem,
} from "../types/admin-session-manual-decisions.types";

export function useAdminSessionManualDecisions(sessionId?: string) {
  return useQuery({
    queryKey: adminSessionRuntimeQueryKeys.manualDecisions(sessionId ?? ""),
    queryFn: () => getAdminSessionManualDecisions(sessionId ?? ""),
    enabled: Boolean(sessionId),
    staleTime: 10_000,
  });
}

export function useCreateAdminSessionManualDecision() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      sessionId,
      body,
    }: {
      sessionId: string;
      body: CreateAdminSessionManualDecisionRequest;
    }) => createAdminSessionManualDecision(sessionId, body),
    onSuccess: (_data, { sessionId }) => {
      // Invalidate all queries for this session so they refetch after a new decision is recorded
      queryClient.invalidateQueries({
        queryKey: adminSessionRuntimeQueryKeys.manualDecisions(sessionId),
      });
      queryClient.invalidateQueries({
        queryKey: adminSessionRuntimeQueryKeys.detail(sessionId),
      });
      queryClient.invalidateQueries({
        queryKey: adminSessionRuntimeQueryKeys.attendance(sessionId),
      });
    },
  });
}

export type UseCreateAdminSessionManualDecisionReturn = ReturnType<
  typeof useCreateAdminSessionManualDecision
>;
