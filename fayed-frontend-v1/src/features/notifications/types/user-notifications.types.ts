export type UserNotificationActionType = "INTERNAL_LINK";

export type UserNotificationAction = {
  type: UserNotificationActionType;
  href: string;
  label: string | null;
};

export type NotificationContext = {
  recipientId?: string;
  recipientName?: string;
  recipientRole?: string;
  patientName?: string;
  practitionerName?: string;
  sessionStartAt?: string;
  sessionStatus?: string;
  supportTicketSubject?: string;
  senderName?: string;
  relatedEntityId?: string;
  relatedEntityLabel?: string;
};

export type NotificationPrimaryAction = {
  kind: "messages" | "session" | "support" | "details";
  label?: string;
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
  context?: NotificationContext;
  primaryAction?: NotificationPrimaryAction;
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

