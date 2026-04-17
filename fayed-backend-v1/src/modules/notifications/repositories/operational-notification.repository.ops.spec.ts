import { NotificationStatus } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { OperationalNotificationRepository } from './operational-notification.repository';

describe('OperationalNotificationRepository ops surfaces', () => {
  const prisma = {
    notification: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
    },
    $transaction: jest
      .fn()
      .mockImplementation((calls: unknown[]) => Promise.all(calls as Promise<unknown>[])),
  } as unknown as PrismaService;

  const repository = new OperationalNotificationRepository(prisma);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('lists operational notifications with status filtering and pagination', async () => {
    (prisma.notification.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.notification.count as jest.Mock).mockResolvedValue(0);

    await repository.listOperationalNotifications({
      statuses: [NotificationStatus.FAILED],
      page: 2,
      limit: 10,
    });

    expect(prisma.notification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: { in: [NotificationStatus.FAILED] },
        }),
        skip: 10,
        take: 10,
      }),
    );
    expect(prisma.notification.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: { in: [NotificationStatus.FAILED] },
        }),
      }),
    );
  });

  it('loads operational notification detail with attempts history', async () => {
    (prisma.notification.findUnique as jest.Mock).mockResolvedValue({ id: 'n1' });

    await repository.findOperationalNotificationById('n1');

    expect(prisma.notification.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'n1' },
        select: expect.objectContaining({
          deliveryAttempts: expect.objectContaining({
            orderBy: { attemptedAt: 'desc' },
            take: 20,
          }),
        }),
      }),
    );
  });
});
