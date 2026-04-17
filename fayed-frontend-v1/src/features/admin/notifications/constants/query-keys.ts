import type { ListAdminNotificationsParams } from "../types/admin-notifications.types";

export const adminNotificationsQueryKeys = {
  all: ["admin", "notifications"] as const,
  list: (params: ListAdminNotificationsParams) =>
    [...adminNotificationsQueryKeys.all, "list", params] as const,
  details: (notificationId: string) =>
    [...adminNotificationsQueryKeys.all, "details", notificationId] as const,
};
