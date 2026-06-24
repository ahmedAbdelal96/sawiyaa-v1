import {
  NotificationCategory,
  NotificationStatus,
  Prisma,
} from '@prisma/client';

export const userNotificationFeedSelect = {
  id: true,
  userId: true,
  status: true,
  channel: true,
  titleSnapshot: true,
  subjectSnapshot: true,
  bodySnapshot: true,
  readAt: true,
  createdAt: true,
  updatedAt: true,
  payloadJson: true,
  relatedEntityType: true,
  relatedEntityId: true,
  notificationType: {
    select: {
      category: true,
      slug: true,
    },
  },
} as const;

export type UserNotificationFeedRow = Prisma.NotificationGetPayload<{
  select: typeof userNotificationFeedSelect;
}>;

export type UserNotificationListPagination = {
  page: number;
  limit: number;
  hasNextPage: boolean;
  nextPage: number | null;
};

export type UserNotificationAction = {
  type: 'INTERNAL_LINK';
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
  kind: 'messages' | 'session' | 'support' | 'details';
  label?: string;
  lane?: 'session' | 'support' | 'care';
  id?: string;
  href?: string;
};

export type UserNotificationFeedItem = {
  id: string;
  typeSlug: string;
  category: NotificationCategory | null;
  title: string;
  body: string;
  createdAt: string;
  readAt: string | null;
  action: UserNotificationAction | null;
  payload: Record<string, unknown>;
  context?: NotificationContext;
  primaryAction?: NotificationPrimaryAction;
};

export type UserNotificationFeedItemRow = UserNotificationFeedRow & {
  notificationType: {
    category: NotificationCategory;
    slug: string;
  };
};

export type UserNotificationReadableRow = UserNotificationFeedItemRow & {
  status: NotificationStatus;
};
