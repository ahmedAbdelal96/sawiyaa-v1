import { useQuery } from "@tanstack/react-query";
import {
  getAdminNotificationDetails,
  listAdminNotifications,
} from "../api/admin-notifications.api";
import { adminNotificationsQueryKeys } from "../constants/query-keys";
import type { ListAdminNotificationsParams } from "../types/admin-notifications.types";
import { useSessionRole } from "@/lib/auth/use-session-role";
import { isAdminRole } from "@/lib/auth/roles";

export function useAdminNotifications(
  params: ListAdminNotificationsParams,
  options?: { enabled?: boolean },
) {
  const role = useSessionRole();
  return useQuery({
    queryKey: adminNotificationsQueryKeys.list(params),
    queryFn: () => listAdminNotifications(params),
    enabled: isAdminRole(role) && (options?.enabled ?? true),
    staleTime: 30_000,
    gcTime: 10 * 60_000,
  });
}

export function useAdminNotificationDetails(notificationId?: string) {
  const role = useSessionRole();
  return useQuery({
    queryKey: adminNotificationsQueryKeys.details(notificationId ?? ""),
    queryFn: () => getAdminNotificationDetails(notificationId as string),
    enabled: isAdminRole(role) && Boolean(notificationId),
    staleTime: 30_000,
    gcTime: 10 * 60_000,
  });
}
