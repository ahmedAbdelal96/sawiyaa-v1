export const NOTIFICATIONS_QUEUE_NAME = 'notifications';
export const NOTIFICATIONS_EMAIL_QUEUE_NAME = 'notifications-email';
export const NOTIFICATIONS_PUSH_QUEUE_NAME = 'notifications-push';
export const NOTIFICATION_DELIVERY_JOB_NAME = 'notification-delivery';
export const NOTIFICATION_JOB_ID_PREFIX = 'notification';

export type NotificationQueueLane = 'DEFAULT' | 'EMAIL' | 'PUSH';

export function notificationQueueName(lane: NotificationQueueLane): string {
  if (lane === 'EMAIL') return NOTIFICATIONS_EMAIL_QUEUE_NAME;
  if (lane === 'PUSH') return NOTIFICATIONS_PUSH_QUEUE_NAME;
  return NOTIFICATIONS_QUEUE_NAME;
}

export function notificationQueueLaneForChannel(
  channel?: string | null,
): NotificationQueueLane {
  if (channel === 'EMAIL') return 'EMAIL';
  if (channel === 'PUSH') return 'PUSH';
  return 'DEFAULT';
}

export type NotificationDeliveryJobData = {
  notificationId: string;
  correlationId?: string;
};

export type NotificationQueuePublishResult =
  | {
      enqueued: true;
      notificationId: string;
      jobId: string;
    }
  | {
      enqueued: false;
      notificationId: string;
      reason: 'QUEUE_DISABLED' | 'ENQUEUE_FAILED';
    };

export function notificationJobId(notificationId: string): string {
  return `${NOTIFICATION_JOB_ID_PREFIX}-${notificationId}`;
}
