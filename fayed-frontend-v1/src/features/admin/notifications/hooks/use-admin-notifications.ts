import { useQuery } from "@tanstack/react-query";
import {
  getAdminNotificationDetails,
  listAdminNotifications,
} from "../api/admin-notifications.api";
import { adminNotificationsQueryKeys } from "../constants/query-keys";
import type { ListAdminNotificationsParams } from "../types/admin-notifications.types";

export function useAdminNotifications(
  params: ListAdminNotificationsParams,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: adminNotificationsQueryKeys.list(params),
    queryFn: () => listAdminNotifications(params),
    enabled: options?.enabled ?? true,
    staleTime: 30_000,
    gcTime: 10 * 60_000,
  });
}

export function useAdminNotificationDetails(notificationId?: string) {
  return useQuery({
    queryKey: adminNotificationsQueryKeys.details(notificationId ?? ""),
    queryFn: () => getAdminNotificationDetails(notificationId as string),
    enabled: Boolean(notificationId),
    staleTime: 30_000,
    gcTime: 10 * 60_000,
  });
}
