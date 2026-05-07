import type { ListMyNotificationsParams } from "../types/user-notifications.types";

export const userNotificationsQueryKeys = {
  all: ["notifications", "me"] as const,
  list: (params: ListMyNotificationsParams) =>
    [...userNotificationsQueryKeys.all, "list", params] as const,
  unreadCount: () => [...userNotificationsQueryKeys.all, "unread-count"] as const,
};

