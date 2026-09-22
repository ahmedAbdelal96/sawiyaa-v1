import type { ListMyNotificationsParams } from "../types/user-notifications.types";

export const userNotificationsQueryKeys = {
  all: ["notifications", "me"] as const,
  list: (params: ListMyNotificationsParams, locale: string = "en") =>
    [...userNotificationsQueryKeys.all, "list", locale, params] as const,
  unreadCount: () => [...userNotificationsQueryKeys.all, "unread-count"] as const,
};

