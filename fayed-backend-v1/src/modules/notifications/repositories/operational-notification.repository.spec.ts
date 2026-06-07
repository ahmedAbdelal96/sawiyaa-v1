import { NotificationChannel, NotificationStatus } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { OperationalNotificationRepository } from './operational-notification.repository';

describe('OperationalNotificationRepository', () => {
  const notificationFindFirst = jest.fn();
  const notificationCreate = jest.fn();

  const prisma = {
    notificationType: {
      findUnique: jest.fn(),
    },
    patientProfile: {
      findUnique: jest.fn(),
    },
    practitionerProfile: {
      findUnique: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    notificationPreference: {
      findUnique: jest.fn(),
    },
    notification: {
      findFirst: notificationFindFirst,
      create: notificationCreate,
      update: jest.fn(),
      updateMany: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    session: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    enrollment: {
      findUnique: jest.fn(),
    },
    payment: {
      findUnique: jest.fn(),
    },
    refund: {
      findUnique: jest.fn(),
    },
    auditEvent: undefined,
    $transaction: jest.fn().mockImplementation((handler: unknown) => {
      if (typeof handler === 'function') {
        return (handler as (tx: unknown) => unknown)(prisma);
      }

      return Promise.all(handler as Promise<unknown>[]);
    }),
  } as unknown as PrismaService;

  const repository = new OperationalNotificationRepository(prisma);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the existing notification when the idempotency key already exists', async () => {
    notificationFindFirst.mockResolvedValueOnce({
      id: 'notif_1',
      userId: 'user_1',
      notificationTypeId: 'type_1',
      channel: NotificationChannel.PUSH,
      status: NotificationStatus.PENDING,
      titleSnapshot: 'Reminder',
      bodySnapshot: 'Your session starts soon.',
      relatedEntityType: 'SESSION',
      relatedEntityId: 'session_1',
      idempotencyKey: 'sessions.session-reminder-60:session_1:user_1:push',
    });

    const result = await repository.createNotification({
      userId: 'user_1',
      notificationTypeId: 'type_1',
      templateId: null,
      channel: NotificationChannel.PUSH,
      status: NotificationStatus.PENDING,
      locale: 'en',
      titleSnapshot: 'Reminder',
      bodySnapshot: 'Your session starts soon.',
      payloadJson: {
        idempotencyKey: 'sessions.session-reminder-60:session_1:user_1:push',
      },
      relatedEntityType: 'SESSION',
      relatedEntityId: 'session_1',
      scheduledFor: new Date('2026-08-02T11:00:00.000Z'),
      idempotencyKey: 'sessions.session-reminder-60:session_1:user_1:push',
    });

    expect(result).toMatchObject({
      id: 'notif_1',
    });
    expect(notificationCreate).not.toHaveBeenCalled();
  });

  it('returns the existing notification when Prisma rejects with P2002 on create', async () => {
    notificationFindFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 'notif_2',
        userId: 'user_1',
        notificationTypeId: 'type_1',
        channel: NotificationChannel.PUSH,
        status: NotificationStatus.PENDING,
        titleSnapshot: 'Reminder',
        bodySnapshot: 'Your session starts soon.',
        relatedEntityType: 'SESSION',
        relatedEntityId: 'session_1',
        idempotencyKey: 'sessions.session-reminder-15:session_1:user_1:push',
      });
    notificationCreate.mockRejectedValueOnce({ code: 'P2002' });

    const result = await repository.createNotification({
      userId: 'user_1',
      notificationTypeId: 'type_1',
      templateId: null,
      channel: NotificationChannel.PUSH,
      status: NotificationStatus.PENDING,
      locale: 'en',
      titleSnapshot: 'Reminder',
      bodySnapshot: 'Your session starts soon.',
      payloadJson: {
        idempotencyKey: 'sessions.session-reminder-15:session_1:user_1:push',
      },
      relatedEntityType: 'SESSION',
      relatedEntityId: 'session_1',
      scheduledFor: new Date('2026-08-02T11:45:00.000Z'),
      idempotencyKey: 'sessions.session-reminder-15:session_1:user_1:push',
    });

    expect(result).toMatchObject({
      id: 'notif_2',
    });
    expect(notificationCreate).toHaveBeenCalledTimes(1);
  });

  it('keeps in-app and push reminders distinct when the channel suffix differs', async () => {
    notificationFindFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    notificationCreate
      .mockResolvedValueOnce({
        id: 'notif_3',
        userId: 'user_1',
        notificationTypeId: 'type_1',
        channel: NotificationChannel.IN_APP,
        status: NotificationStatus.SENT,
        titleSnapshot: 'Reminder',
        bodySnapshot: 'Your session starts soon.',
        relatedEntityType: 'SESSION',
        relatedEntityId: 'session_1',
        idempotencyKey: 'sessions.session-reminder-60:session_1:user_1:in-app',
      })
      .mockResolvedValueOnce({
        id: 'notif_4',
        userId: 'user_1',
        notificationTypeId: 'type_1',
        channel: NotificationChannel.PUSH,
        status: NotificationStatus.PENDING,
        titleSnapshot: 'Reminder',
        bodySnapshot: 'Your session starts soon.',
        relatedEntityType: 'SESSION',
        relatedEntityId: 'session_1',
        idempotencyKey: 'sessions.session-reminder-60:session_1:user_1:push',
      });

    const inApp = await repository.createNotification({
      userId: 'user_1',
      notificationTypeId: 'type_1',
      templateId: null,
      channel: NotificationChannel.IN_APP,
      status: NotificationStatus.SENT,
      locale: 'en',
      titleSnapshot: 'Reminder',
      bodySnapshot: 'Your session starts soon.',
      payloadJson: {
        idempotencyKey: 'sessions.session-reminder-60:session_1:user_1:in-app',
      },
      relatedEntityType: 'SESSION',
      relatedEntityId: 'session_1',
      idempotencyKey: 'sessions.session-reminder-60:session_1:user_1:in-app',
    });

    const push = await repository.createNotification({
      userId: 'user_1',
      notificationTypeId: 'type_1',
      templateId: null,
      channel: NotificationChannel.PUSH,
      status: NotificationStatus.PENDING,
      locale: 'en',
      titleSnapshot: 'Reminder',
      bodySnapshot: 'Your session starts soon.',
      payloadJson: {
        idempotencyKey: 'sessions.session-reminder-60:session_1:user_1:push',
      },
      relatedEntityType: 'SESSION',
      relatedEntityId: 'session_1',
      scheduledFor: new Date('2026-08-02T11:00:00.000Z'),
      idempotencyKey: 'sessions.session-reminder-60:session_1:user_1:push',
    });

    expect(inApp).toMatchObject({ id: 'notif_3' });
    expect(push).toMatchObject({ id: 'notif_4' });
    expect(notificationCreate).toHaveBeenCalledTimes(2);
  });
});
