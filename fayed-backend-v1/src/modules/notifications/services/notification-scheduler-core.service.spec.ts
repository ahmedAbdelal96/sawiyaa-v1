import { NotificationLifecycleService } from './notification-lifecycle.service';
import { NotificationSchedulerCoreService } from './notification-scheduler-core.service';
import { OperationalNotificationRepository } from '../repositories/operational-notification.repository';

describe('NotificationSchedulerCoreService', () => {
  const repository = {
    listDueNotificationIds: jest.fn(),
    claimNotificationForExecution: jest.fn(),
  } as unknown as OperationalNotificationRepository;
  const lifecycle = {
    assertCanBeClaimedForExecution: jest.fn(),
  } as unknown as NotificationLifecycleService;

  const service = new NotificationSchedulerCoreService(repository, lifecycle);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('selects due items and claims each atomically', async () => {
    (repository.listDueNotificationIds as jest.Mock).mockResolvedValue([
      { id: 'n1' },
      { id: 'n2' },
    ]);
    (repository.claimNotificationForExecution as jest.Mock)
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 1 });

    const result = await service.claimDueNotifications({
      now: new Date('2026-04-01T10:00:00.000Z'),
      limit: 10,
    });

    expect(repository.listDueNotificationIds).toHaveBeenCalledWith({
      now: new Date('2026-04-01T10:00:00.000Z'),
      limit: 10,
    });
    expect(repository.claimNotificationForExecution).toHaveBeenCalledTimes(2);
    expect(result).toEqual({
      scannedCount: 2,
      claimedCount: 2,
      claimedNotificationIds: ['n1', 'n2'],
    });
  });

  it('prevents duplicate claim when race loses on same notification', async () => {
    (repository.listDueNotificationIds as jest.Mock).mockResolvedValue([{ id: 'n1' }]);
    (repository.claimNotificationForExecution as jest.Mock).mockResolvedValue({
      count: 0,
    });

    const result = await service.claimDueNotifications({
      now: new Date('2026-04-01T10:00:00.000Z'),
      limit: 10,
    });

    expect(result).toEqual({
      scannedCount: 1,
      claimedCount: 0,
      claimedNotificationIds: [],
    });
  });
});
