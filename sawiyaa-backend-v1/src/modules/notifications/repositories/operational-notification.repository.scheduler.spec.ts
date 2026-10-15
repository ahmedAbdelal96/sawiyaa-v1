import { NotificationStatus } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { OperationalNotificationRepository } from './operational-notification.repository';

describe('OperationalNotificationRepository scheduler core', () => {
  const prisma = {
    notification: {
      findMany: jest.fn(),
      updateMany: jest.fn(),
      findFirst: jest.fn(),
    },
    $queryRaw: jest.fn(),
    notificationDeliveryAttempt: {
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  } as unknown as PrismaService;

  const repository = new OperationalNotificationRepository(prisma);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('queries only due pending notifications with deterministic order and limit', async () => {
    (prisma.notification.findMany as jest.Mock).mockResolvedValue([
      { id: 'n1' },
    ]);
    const now = new Date('2026-04-01T10:00:00.000Z');

    await repository.listDueNotificationIds({ now, limit: 25 });

    expect(prisma.notification.findMany).toHaveBeenCalledWith({
      where: {
        status: NotificationStatus.PENDING,
        scheduledFor: {
          not: null,
          lte: now,
        },
      },
      orderBy: [{ scheduledFor: 'asc' }, { createdAt: 'asc' }],
      take: 25,
      select: {
        id: true,
      },
    });
  });

  it('claims notification atomically only when still pending and due', async () => {
    (prisma.notification.updateMany as jest.Mock).mockResolvedValue({
      count: 1,
    });
    (prisma.$queryRaw as jest.Mock).mockResolvedValue([
      { id: 'n1', status: NotificationStatus.PENDING },
    ]);
    const now = new Date('2026-04-01T10:00:00.000Z');

    await repository.claimNotificationForExecution({
      notificationId: 'n1',
      now,
    });

    expect(prisma.notification.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'n1', status: NotificationStatus.PENDING },
        data: expect.objectContaining({
          status: NotificationStatus.QUEUED,
          claimToken: expect.any(String),
          claimedAt: now,
          claimUntil: expect.any(Date),
        }),
      }),
    );
  });

  it('lists only stale queued notifications for recovery', async () => {
    (prisma.notification.findMany as jest.Mock).mockResolvedValue([
      { id: 'stale-1' },
    ]);
    const now = new Date('2026-04-01T10:00:00.000Z');

    await repository.listStaleQueuedNotificationIds({ now, limit: 25 });

    expect(prisma.notification.findMany).toHaveBeenCalledWith({
      where: {
        status: NotificationStatus.QUEUED,
        claimUntil: { not: null, lte: now },
        OR: [{ scheduledFor: null }, { scheduledFor: { lte: now } }],
      },
      orderBy: [{ claimUntil: 'asc' }, { updatedAt: 'asc' }],
      take: 25,
      select: { id: true },
    });
  });

  it('loads queued notification with execution payload only', async () => {
    (prisma.notification.findFirst as jest.Mock).mockResolvedValue({
      id: 'n1',
    });

    await repository.findQueuedNotificationForExecution('n1');

    expect(prisma.notification.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'n1',
        status: NotificationStatus.QUEUED,
      },
      select: {
        id: true,
        userId: true,
        channel: true,
        locale: true,
        status: true,
        titleSnapshot: true,
        subjectSnapshot: true,
        bodySnapshot: true,
        scheduledFor: true,
        payloadJson: true,
        relatedEntityType: true,
        relatedEntityId: true,
        notificationType: {
          select: {
            slug: true,
            category: true,
          },
        },
      },
    });
  });

  it('marks queued notification as sent only when still queued', async () => {
    (prisma.notification.updateMany as jest.Mock).mockResolvedValue({
      count: 1,
    });
    const sentAt = new Date('2026-04-01T11:00:00.000Z');

    await repository.markQueuedNotificationSent({
      notificationId: 'n1',
      sentAt,
    });

    expect(prisma.notification.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'n1',
        status: NotificationStatus.QUEUED,
      },
      data: {
        status: NotificationStatus.SENT,
        scheduledFor: null,
        sentAt,
        failedAt: null,
        suppressedReason: null,
      },
    });
  });

  it('reschedules queued notification back to pending with next retry date', async () => {
    (prisma.notification.updateMany as jest.Mock).mockResolvedValue({
      count: 1,
    });
    const retryAt = new Date('2026-04-01T11:05:00.000Z');

    await repository.rescheduleQueuedNotificationForRetry({
      notificationId: 'n1',
      retryAt,
    });

    expect(prisma.notification.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'n1',
        status: NotificationStatus.QUEUED,
      },
      data: {
        status: NotificationStatus.PENDING,
        scheduledFor: retryAt,
        failedAt: null,
      },
    });
  });

  it('suppresses queued notification with explicit reason', async () => {
    (prisma.notification.updateMany as jest.Mock).mockResolvedValue({
      count: 1,
    });

    await repository.markQueuedNotificationSuppressed({
      notificationId: 'n1',
      reason: 'SESSION_STATUS_CANCELLED',
    });

    expect(prisma.notification.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'n1',
        status: NotificationStatus.QUEUED,
      },
      data: {
        status: NotificationStatus.SUPPRESSED,
        scheduledFor: null,
        suppressedReason: 'SESSION_STATUS_CANCELLED',
      },
    });
  });

  it('fences old-owner delivery-attempt updates after a reclaim', async () => {
    (prisma.$queryRaw as jest.Mock).mockResolvedValueOnce([]);

    await expect(
      repository.updateDeliveryAttemptWithClaim({
        attemptId: 'attempt-a',
        notificationId: 'n1',
        claimToken: 'old-owner-token',
        now: new Date('2026-04-01T10:05:00.000Z'),
        data: { status: 'SENT' },
      }),
    ).resolves.toEqual({ count: 0 });

    expect(
      prisma.notificationDeliveryAttempt.updateMany,
    ).not.toHaveBeenCalled();
  });

  it('updates the attempt only while the current owner holds the lease', async () => {
    (prisma.$queryRaw as jest.Mock).mockResolvedValueOnce([{ id: 'n1' }]);
    (
      prisma.notificationDeliveryAttempt.updateMany as jest.Mock
    ).mockResolvedValueOnce({
      count: 1,
    });

    await expect(
      repository.updateDeliveryAttemptWithClaim({
        attemptId: 'attempt-b',
        notificationId: 'n1',
        claimToken: 'current-owner-token',
        now: new Date('2026-04-01T10:05:00.000Z'),
        data: { status: 'SENT' },
      }),
    ).resolves.toEqual({ count: 1 });

    expect(prisma.notificationDeliveryAttempt.updateMany).toHaveBeenCalledWith({
      where: { id: 'attempt-b', notificationId: 'n1' },
      data: { status: 'SENT' },
    });
  });
});
