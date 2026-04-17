import { useQuery } from "@tanstack/react-query";
import { listAdminSessions } from "../api/admin-sessions.api";
import { adminSessionsQueryKeys } from "../constants/query-keys";
import type { ListAdminSessionsParams } from "../types/admin-sessions.types";

export function useAdminSessions(params: ListAdminSessionsParams) {
  return useQuery({
    queryKey: adminSessionsQueryKeys.list(params),
    queryFn: () => listAdminSessions(params),
    staleTime: 30_000,
    gcTime: 10 * 60_000,
  });
}

