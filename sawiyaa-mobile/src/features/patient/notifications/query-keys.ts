import type { ListMyNotificationsParams } from './types';

export const patientNotificationQueryKeys = {
  all: ['patient-notifications'] as const,
  list: (params: ListMyNotificationsParams, locale: 'ar' | 'en' = 'en') =>
    [...patientNotificationQueryKeys.all, 'list', locale, params] as const,
  unreadCount: () =>
    [...patientNotificationQueryKeys.all, 'unread-count'] as const,
};
