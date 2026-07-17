"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createAdminSessionPackageEntitlementDecision,
  getAdminSessionAttendance,
  getAdminSessionRuntimeInspection,
} from "../api/admin-session-runtime.api";
import { adminSessionRuntimeQueryKeys } from "../constants/query-keys";
import type {
  CreateAdminSessionPackageEntitlementDecisionRequest,
} from "../types/admin-session-runtime.types";

export function useAdminSessionRuntimeInspection(
  sessionId?: string,
  enabled: boolean = true,
) {
  return useQuery({
    queryKey: adminSessionRuntimeQueryKeys.detail(sessionId ?? ""),
    queryFn: () => getAdminSessionRuntimeInspection(sessionId ?? ""),
    enabled: Boolean(sessionId) && enabled,
    staleTime: 10_000,
  });
}

export function useAdminSessionAttendance(
  sessionId?: string,
  enabled: boolean = true,
) {
  return useQuery({
    queryKey: adminSessionRuntimeQueryKeys.attendance(sessionId ?? ""),
    queryFn: () => getAdminSessionAttendance(sessionId ?? ""),
    enabled: Boolean(sessionId) && enabled,
    staleTime: 10_000,
  });
}

export function useCreateAdminSessionPackageEntitlementDecision() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      sessionId,
      body,
    }: {
      sessionId: string;
      body: CreateAdminSessionPackageEntitlementDecisionRequest;
    }) => createAdminSessionPackageEntitlementDecision(sessionId, body),
    onSuccess: (_data, { sessionId }) => {
      queryClient.invalidateQueries({
        queryKey: adminSessionRuntimeQueryKeys.detail(sessionId),
      });
    },
  });
}
