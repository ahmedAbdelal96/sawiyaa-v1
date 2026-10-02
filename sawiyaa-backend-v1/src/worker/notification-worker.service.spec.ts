import { NotificationDeliveryAttemptEngineService } from '@modules/notifications/services/notification-delivery-attempt-engine.service';
import { NotificationSchedulerCoreService } from '@modules/notifications/services/notification-scheduler-core.service';
import { NotificationQueueService } from '@common/queue/notification-queue.service';
import { NotificationQueueWorkerService } from './notification-worker.service';

describe('NotificationQueueWorkerService', () => {
  const claimNotificationById = jest.fn();
  const executeClaimedNotification = jest.fn();
  const createWorker = jest.fn();
  const closeQueue = jest.fn();

  const queueService = {
    isEnabled: jest.fn(() => true),
    getWorkerHeartbeatIntervalMs: jest.fn(() => 10_000),
    recordWorkerHeartbeat: jest.fn(),
    recordWorkerError: jest.fn(),
    createWorker,
    close: closeQueue,
  } as unknown as NotificationQueueService;
  const scheduler = {
    claimNotificationById,
  } as unknown as NotificationSchedulerCoreService;
  const engine = {
    executeClaimedNotification,
  } as unknown as NotificationDeliveryAttemptEngineService;

  beforeEach(() => {
    jest.clearAllMocks();
    claimNotificationById.mockResolvedValue(true);
    executeClaimedNotification.mockResolvedValue({
      notificationId: 'n1',
      outcome: 'SENT',
      executed: true,
    });
  });

  it('claims by id, reloads through the existing engine, and persists delivery there', async () => {
    const service = new NotificationQueueWorkerService(
      queueService,
      scheduler,
      engine,
    );

    const result = await service.processJob({
      name: 'notification-delivery',
      data: { notificationId: 'n1' },
    } as never);

    expect(claimNotificationById).toHaveBeenCalledWith({
      notificationId: 'n1',
      now: expect.any(Date),
    });
    expect(executeClaimedNotification).toHaveBeenCalledWith({
      notificationId: 'n1',
      now: expect.any(Date),
    });
    expect(result).toEqual(
      expect.objectContaining({ notificationId: 'n1', outcome: 'SENT' }),
    );
  });

  it('does not execute when the DB claim was already won by the fallback runner or another worker', async () => {
    claimNotificationById.mockResolvedValue(false);
    const service = new NotificationQueueWorkerService(
      queueService,
      scheduler,
      engine,
    );

    await expect(
      service.processJob({
        name: 'notification-delivery',
        data: { notificationId: 'n1' },
      } as never),
    ).resolves.toEqual({
      notificationId: 'n1',
      outcome: 'SKIPPED',
      executed: false,
      reason: 'CLAIM_NOT_WON',
    });
    expect(executeClaimedNotification).not.toHaveBeenCalled();
  });

  it('closes the BullMQ worker during graceful shutdown', async () => {
    const workerClose = jest.fn().mockResolvedValue(undefined);
    createWorker.mockImplementation((processor: unknown) => {
      expect(typeof processor).toBe('function');
      return {
        on: jest.fn(),
        close: workerClose,
      };
    });

    const service = new NotificationQueueWorkerService(
      queueService,
      scheduler,
      engine,
    );
    service.onModuleInit();
    await service.onModuleDestroy();

    expect(workerClose).toHaveBeenCalledTimes(1);
  });
});
