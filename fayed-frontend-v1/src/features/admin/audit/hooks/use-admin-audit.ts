import { useQuery } from "@tanstack/react-query";
import { getAdminAuditEventDetails, listAdminAuditEvents } from "../api/admin-audit.api";
import { adminAuditQueryKeys } from "../constants/query-keys";
import type { ListAdminAuditEventsParams } from "../types/admin-audit.types";
import { useSessionRole } from "@/lib/auth/use-session-role";
import { isAdminRole } from "@/lib/auth/roles";

export function useAdminAuditEvents(
  params: ListAdminAuditEventsParams,
  options?: { enabled?: boolean },
) {
  const role = useSessionRole();
  return useQuery({
    queryKey: adminAuditQueryKeys.list(params),
    queryFn: () => listAdminAuditEvents(params),
    enabled: isAdminRole(role) && (options?.enabled ?? true),
    staleTime: 30_000,
    gcTime: 10 * 60_000,
  });
}

export function useAdminAuditEventDetails(eventId?: string) {
  const role = useSessionRole();
  return useQuery({
    queryKey: adminAuditQueryKeys.details(eventId ?? ""),
    queryFn: () => getAdminAuditEventDetails(eventId as string),
    enabled: isAdminRole(role) && Boolean(eventId),
    staleTime: 30_000,
    gcTime: 10 * 60_000,
  });
}
