"use client";

import { useQuery } from "@tanstack/react-query";
import {
  getAdminSessionAttendance,
  getAdminSessionRuntimeInspection,
} from "../api/admin-session-runtime.api";
import { adminSessionRuntimeQueryKeys } from "../constants/query-keys";

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
