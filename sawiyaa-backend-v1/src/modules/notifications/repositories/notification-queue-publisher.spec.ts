import { NotificationChannel, NotificationStatus } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { NotificationQueueService } from '@common/queue/notification-queue.service';
import { OperationalNotificationRepository } from './operational-notification.repository';

describe('notification persistence queue bridge', () => {
  const notificationCreate = jest.fn();
  const notificationFindFirst = jest.fn();
  const queuePublisher = {
    enqueueNotification: jest.fn(),
  } as unknown as NotificationQueueService;
  const prisma = {
    notification: {
      create: notificationCreate,
      findFirst: notificationFindFirst,
    },
    auditEvent: undefined,
    $transaction: jest.fn().mockImplementation((handler: unknown) =>
      (handler as (tx: unknown) => unknown)(prisma),
    ),
  } as unknown as PrismaService;

  const repository = new OperationalNotificationRepository(
    prisma,
    queuePublisher,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    notificationFindFirst.mockResolvedValue(null);
    notificationCreate.mockResolvedValue({ id: 'notification_1' });
    (queuePublisher.enqueueNotification as jest.Mock).mockResolvedValue({
      enqueued: true,
      notificationId: 'notification_1',
      jobId: 'notification-notification_1',
    });
  });

  it('publishes after a pending notification row is durably created', async () => {
    await repository.createNotification({
      userId: 'user_1',
      notificationTypeId: 'type_1',
      channel: NotificationChannel.EMAIL,
      status: NotificationStatus.PENDING,
      locale: 'en',
      titleSnapshot: 'Title',
      bodySnapshot: 'Body',
      relatedEntityType: 'SESSION',
      relatedEntityId: 'session_1',
    });

    expect(notificationCreate).toHaveBeenCalledTimes(1);
    expect(queuePublisher.enqueueNotification).toHaveBeenCalledWith(
      'notification_1',
    );
  });

  it('does not enqueue OTP rows that are delivered synchronously', async () => {
    await repository.createNotification({
      userId: 'user_1',
      notificationTypeId: 'type_otp',
      channel: NotificationChannel.EMAIL,
      status: NotificationStatus.PENDING,
      locale: 'en',
      titleSnapshot: 'OTP',
      bodySnapshot: '[OTP email content redacted]',
      relatedEntityType: 'OTP_CHALLENGE',
    });

    expect(queuePublisher.enqueueNotification).not.toHaveBeenCalled();
  });

  it('does not make notification persistence depend on enqueue success', async () => {
    (queuePublisher.enqueueNotification as jest.Mock).mockRejectedValue(
      new Error('redis unavailable'),
    );

    await expect(
      repository.createNotification({
        userId: 'user_1',
        notificationTypeId: 'type_1',
        channel: NotificationChannel.EMAIL,
        status: NotificationStatus.PENDING,
        locale: 'en',
        titleSnapshot: 'Title',
        bodySnapshot: 'Body',
      }),
    ).resolves.toMatchObject({ id: 'notification_1' });
  });
});
