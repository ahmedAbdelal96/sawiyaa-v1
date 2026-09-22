import type { ListMyNotificationsParams } from '../../patient/notifications/types';

export const practitionerNotificationQueryKeys = {
  all: ['practitioner-notifications'] as const,
  list: (params: ListMyNotificationsParams, locale: 'ar' | 'en' = 'en') =>
    [...practitionerNotificationQueryKeys.all, 'list', locale, params] as const,
  unreadCount: () =>
    [...practitionerNotificationQueryKeys.all, 'unread-count'] as const,
};
