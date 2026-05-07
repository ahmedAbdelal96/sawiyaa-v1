export type UserNotificationActionType = "INTERNAL_LINK";

export type UserNotificationAction = {
  type: UserNotificationActionType;
  href: string;
  label: string | null;
};

export type UserNotificationItem = {
  id: string;
  typeSlug: string;
  category: string | null;
  title: string;
  body: string;
  createdAt: string;
  readAt: string | null;
  action: UserNotificationAction | null;
  payload: Record<string, unknown>;
};

export type UserNotificationPagination = {
  page: number;
  limit: number;
  hasNextPage: boolean;
  nextPage: number | null;
};

export type ListMyNotificationsParams = {
  page?: number;
  limit?: number;
};

export type UserNotificationsListResponseData = {
  items: UserNotificationItem[];
  pagination: UserNotificationPagination;
};

export type UserUnreadNotificationCountResponseData = {
  item: {
    unreadCount: number;
  };
};

export type UserNotificationReadResponseData = {
  item: UserNotificationItem;
};

export type UserNotificationBulkReadResponseData = {
  item: {
    updatedCount: number;
  };
};

