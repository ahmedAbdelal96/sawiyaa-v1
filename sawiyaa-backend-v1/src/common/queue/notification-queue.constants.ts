export const NOTIFICATIONS_QUEUE_NAME = 'notifications';
export const NOTIFICATION_DELIVERY_JOB_NAME = 'notification-delivery';
export const NOTIFICATION_JOB_ID_PREFIX = 'notification';

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
