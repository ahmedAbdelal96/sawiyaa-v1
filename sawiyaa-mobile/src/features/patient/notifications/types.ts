export type UserNotificationActionType = "INTERNAL_LINK";

export type UserNotificationAction = {
  type: UserNotificationActionType;
  href: string;
  label: string | null;
};

export type UserNotificationContext = {
  patientName?: string;
  practitionerName?: string;
  senderName?: string;
  sessionStartAt?: string;
  sessionCode?: string;
  supportTicketSubject?: string;
  relatedEntityId?: string;
};

export type UserNotificationPrimaryAction = {
  kind: "messages" | "session" | "support" | "details";
  lane?: "session" | "support" | "care";
  id?: string;
  href?: string;
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
  context?: UserNotificationContext;
  primaryAction?: UserNotificationPrimaryAction;
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
