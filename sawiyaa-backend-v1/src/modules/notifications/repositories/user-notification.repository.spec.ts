import { NotificationChannel, NotificationStatus } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { UserNotificationRepository } from './user-notification.repository';

describe('UserNotificationRepository', () => {
  const notificationTypeFindUnique = jest.fn();
  const notificationPreferenceFindUnique = jest.fn();
  const notificationFindMany = jest.fn();
  const notificationCount = jest.fn();
  const notificationFindFirst = jest.fn();
  const notificationFindUnique = jest.fn();
  const notificationUpdateMany = jest.fn();
  const notificationCreate = jest.fn();

  const prisma = {
    notificationType: {
      findUnique: notificationTypeFindUnique,
    },
    notificationPreference: {
      findUnique: notificationPreferenceFindUnique,
    },
    notification: {
      findMany: notificationFindMany,
      count: notificationCount,
      findFirst: notificationFindFirst,
      findUnique: notificationFindUnique,
      updateMany: notificationUpdateMany,
      create: notificationCreate,
    },
    $transaction: jest.fn().mockImplementation((handler: unknown) => {
      if (typeof handler === 'function') {
        return (handler as (tx: unknown) => unknown)(prisma);
      }

      return Promise.all(handler as Promise<unknown>[]);
    }),
  } as unknown as PrismaService;

  const repository = new UserNotificationRepository(prisma);
  const notificationFindManyMock = notificationFindMany;
  const notificationCountMock = notificationCount;
  const notificationFindFirstMock = notificationFindFirst;
  const notificationFindUniqueMock = notificationFindUnique;
  const notificationCreateMock = notificationCreate;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('lists only visible in-app notifications and excludes archived or dismissed feed states', async () => {
    notificationFindManyMock.mockResolvedValue([]);

    await repository.listMyInAppNotifications({
      userId: 'user_1',
      page: 2,
      limit: 10,
      now: new Date('2026-05-01T10:00:00.000Z'),
    });

    expect(notificationFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        // The nested matcher is intentionally structural; the mock args are verified at the boundary.
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        where: expect.objectContaining({
          userId: 'user_1',
          channel: NotificationChannel.IN_APP,
          status: {
            in: [
              NotificationStatus.SENT,
              NotificationStatus.DELIVERED,
              NotificationStatus.READ,
            ],
          },
          feedStates: {
            none: {
              userId: 'user_1',
              OR: [{ isArchived: true }, { isDismissed: true }],
            },
          },
        }),
        skip: 10,
        take: 11,
      }),
    );
  });

  it('counts unread visible in-app notifications with a lightweight count query', async () => {
    notificationCountMock.mockResolvedValue(3);

    const unread = await repository.countUnreadMyInAppNotifications({
      userId: 'user_1',
      now: new Date('2026-05-01T10:00:00.000Z'),
    });

    expect(unread).toBe(3);
    expect(notificationCountMock).toHaveBeenCalledWith(
      expect.objectContaining({
        // The nested matcher is intentionally structural; the mock args are verified at the boundary.
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        where: expect.objectContaining({
          userId: 'user_1',
          channel: NotificationChannel.IN_APP,
          readAt: null,
        }),
      }),
    );
  });

  it('deduplicates creation when idempotency key matches an existing notification', async () => {
    notificationFindFirstMock.mockResolvedValue({
      id: 'notif_1',
    });
    notificationFindUniqueMock.mockResolvedValue({
      id: 'notif_1',
      userId: 'user_1',
      status: NotificationStatus.SENT,
      channel: NotificationChannel.IN_APP,
      titleSnapshot: 'Session ready',
      subjectSnapshot: null,
      bodySnapshot: 'Your session can be opened now.',
      readAt: null,
      createdAt: new Date('2026-05-01T10:00:00.000Z'),
      updatedAt: new Date('2026-05-01T10:00:00.000Z'),
      payloadJson: { idempotencyKey: 'session-ready:user_1' },
      relatedEntityType: 'SESSION',
      relatedEntityId: 'session_1',
      notificationType: {
        category: 'SESSION',
        slug: 'sessions.session-join-available',
      },
    });

    const result = await repository.createInAppNotification({
      userId: 'user_1',
      notificationTypeId: 'type_1',
      templateId: null,
      locale: 'en',
      titleSnapshot: 'Session ready',
      bodySnapshot: 'Your session can be opened now.',
      payloadJson: {
        idempotencyKey: 'session-ready:user_1',
      },
      relatedEntityType: 'SESSION',
      relatedEntityId: 'session_1',
      idempotencyKey: 'session-ready:user_1',
    });

    expect(result?.id).toBe('notif_1');
    expect(notificationCreateMock).not.toHaveBeenCalled();
  });

  it('returns the existing row when a unique idempotency conflict happens on create', async () => {
    notificationFindFirstMock
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 'notif_2',
        userId: 'user_1',
        status: NotificationStatus.SENT,
        channel: NotificationChannel.IN_APP,
        titleSnapshot: 'Session ready',
        subjectSnapshot: null,
        bodySnapshot: 'Your session can be opened now.',
        readAt: null,
        createdAt: new Date('2026-05-01T10:00:00.000Z'),
        updatedAt: new Date('2026-05-01T10:00:00.000Z'),
        payloadJson: { idempotencyKey: 'session-ready:user_1' },
        relatedEntityType: 'SESSION',
        relatedEntityId: 'session_1',
        notificationType: {
          category: 'SESSION',
          slug: 'sessions.session-join-available',
        },
      });
    notificationCreateMock.mockRejectedValueOnce({
      code: 'P2002',
    });

    const result = await repository.createInAppNotification({
      userId: 'user_1',
      notificationTypeId: 'type_1',
      templateId: null,
      locale: 'en',
      titleSnapshot: 'Session ready',
      bodySnapshot: 'Your session can be opened now.',
      payloadJson: {
        idempotencyKey: 'session-ready:user_1',
      },
      relatedEntityType: 'SESSION',
      relatedEntityId: 'session_1',
      idempotencyKey: 'session-ready:user_1',
    });

    expect(result?.id).toBe('notif_2');
    expect(notificationCreateMock).toHaveBeenCalledTimes(1);
  });

  it('creates pending email notifications with a target payload and scheduled delivery time', async () => {
    notificationFindFirstMock.mockResolvedValue(null);
    notificationCreateMock.mockResolvedValue({
      id: 'email_notif_1',
      userId: 'user_1',
      status: NotificationStatus.PENDING,
      channel: NotificationChannel.EMAIL,
      titleSnapshot: 'Session ready',
      subjectSnapshot: 'Your session is ready',
      bodySnapshot: 'Open the session page.',
      readAt: null,
      createdAt: new Date('2026-05-01T10:00:00.000Z'),
      updatedAt: new Date('2026-05-01T10:00:00.000Z'),
      payloadJson: {
        target: 'patient@example.com',
        idempotencyKey: 'session-ready-email:user_1',
      },
      relatedEntityType: 'SESSION',
      relatedEntityId: 'session_1',
      notificationType: {
        category: 'SESSION',
        slug: 'sessions.session-join-available',
      },
    });

    await expect(
      repository.createEmailNotification({
        userId: 'user_1',
        notificationTypeId: 'type_1',
        templateId: 'template_email_1',
        locale: 'en',
        subjectSnapshot: 'Your session is ready',
        titleSnapshot: 'Session ready',
        bodySnapshot: 'Open the session page.',
        payloadJson: {
          target: 'patient@example.com',
          idempotencyKey: 'session-ready-email:user_1',
        },
        relatedEntityType: 'SESSION',
        relatedEntityId: 'session_1',
        scheduledFor: new Date('2026-05-01T10:05:00.000Z'),
        idempotencyKey: 'session-ready-email:user_1',
      }),
    ).resolves.toMatchObject({
      id: 'email_notif_1',
    });
    const createArgs = notificationCreateMock.mock.calls[0] as unknown as [
      {
        data: {
          channel: NotificationChannel;
          status: NotificationStatus;
          idempotencyKey: string | null;
        };
      },
    ];
    expect(createArgs[0].data.channel).toBe(NotificationChannel.EMAIL);
    expect(createArgs[0].data.status).toBe(NotificationStatus.PENDING);
    expect(createArgs[0].data.idempotencyKey).toBe(
      'session-ready-email:user_1',
    );
  });
});
