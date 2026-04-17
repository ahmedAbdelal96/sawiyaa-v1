export type AdminNotificationStatus =
  | "PENDING"
  | "QUEUED"
  | "SENT"
  | "DELIVERED"
  | "READ"
  | "FAILED"
  | "CANCELLED"
  | "SUPPRESSED";

export type AdminNotificationChannel = "EMAIL" | "SMS" | "PUSH" | "IN_APP";

export type AdminNotificationCategory =
  | "SECURITY"
  | "SESSION"
  | "PAYMENT"
  | "CONTENT"
  | "SUPPORT"
  | "CHAT"
  | "SYSTEM"
  | "TRAINING"
  | "MARKETING";

export type AdminDeliveryAttemptStatus =
  | "PENDING"
  | "SENT"
  | "DELIVERED"
  | "FAILED";

export type ListAdminNotificationsParams = {
  page?: number;
  limit?: number;
  status?: AdminNotificationStatus;
  channel?: AdminNotificationChannel;
  category?: AdminNotificationCategory;
  scheduledFrom?: string;
  scheduledTo?: string;
};

export type AdminNotificationsPagination = {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
};

export type AdminNotificationListItem = {
  id: string;
  status: AdminNotificationStatus;
  channel: AdminNotificationChannel;
  category: AdminNotificationCategory;
  typeSlug: string;
  userId: string;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
  scheduledFor: string | null;
  sentAt: string | null;
  failedAt: string | null;
  suppressedReason: string | null;
  attemptsCount: number;
  latestAttemptStatus: AdminDeliveryAttemptStatus | null;
  latestAttemptErrorCode: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AdminNotificationAttemptItem = {
  id: string;
  attemptNumber: number;
  status: AdminDeliveryAttemptStatus;
  provider: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  attemptedAt: string;
};

export type AdminNotificationDetailItem = {
  id: string;
  status: AdminNotificationStatus;
  channel: AdminNotificationChannel;
  category: AdminNotificationCategory;
  typeSlug: string;
  userId: string;
  locale: string | null;
  titleSnapshot: string | null;
  subjectSnapshot: string | null;
  bodySnapshot: string | null;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
  scheduledFor: string | null;
  sentAt: string | null;
  failedAt: string | null;
  suppressedReason: string | null;
  createdAt: string;
  updatedAt: string;
  attempts: AdminNotificationAttemptItem[];
};

export type AdminNotificationsListResponseData = {
  items: AdminNotificationListItem[];
  pagination: AdminNotificationsPagination;
};

export type AdminNotificationDetailResponseData = {
  item: AdminNotificationDetailItem;
};
