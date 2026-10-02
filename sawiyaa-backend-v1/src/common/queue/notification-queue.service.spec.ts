import { Queue } from 'bullmq';
import { NotificationQueueService } from './notification-queue.service';

jest.mock('bullmq', () => ({
  Queue: jest.fn(),
}));

describe('NotificationQueueService', () => {
  const add = jest.fn();
  const close = jest.fn();
  const getJobCounts = jest.fn();
  const getJobs = jest.fn();
  const on = jest.fn();
  const redisGet = jest.fn();
  const config = {
    get: jest.fn((key: string) => {
      const values: Record<string, unknown> = {
        'notificationQueue.enabled': true,
        'notificationQueue.redisUrl': 'redis://queue.example:6379',
        'notificationQueue.prefix': 'sawiyaa:notifications',
        'notificationQueue.connectionTimeoutMs': 5000,
        'notificationQueue.workerConcurrency': 2,
      };
      return values[key];
    }),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    config.get.mockImplementation((key: string) => {
      const values: Record<string, unknown> = {
        'notificationQueue.enabled': true,
        'notificationQueue.redisUrl': 'redis://queue.example:6379',
        'notificationQueue.prefix': 'sawiyaa:notifications',
        'notificationQueue.connectionTimeoutMs': 5000,
        'notificationQueue.workerConcurrency': 2,
      };
      return values[key];
    });
    getJobCounts.mockResolvedValue({
      waiting: 3,
      active: 1,
      completed: 8,
      failed: 2,
      delayed: 4,
    });
    getJobs.mockResolvedValue([{ timestamp: Date.now() - 2500 }]);
    redisGet.mockResolvedValue(null);
    (Queue as jest.Mock).mockImplementation(() => ({
      add,
      close,
      on,
      getJobCounts,
      getJobs,
      client: Promise.resolve({ get: redisGet }),
    }));
    add.mockResolvedValue({ id: 'notification-n1' });
    close.mockResolvedValue(undefined);
  });

  it('publishes only the notification id with a deterministic job id', async () => {
    const service = new NotificationQueueService(config as never);
    service.onModuleInit();

    const result = await service.enqueueNotification('n1', {
      correlationId: 'request-1',
    });

    expect(Queue).toHaveBeenCalledWith(
      'notifications',
      expect.objectContaining({
        prefix: 'sawiyaa:notifications',
        connection: expect.objectContaining({
          host: 'queue.example',
          port: 6379,
          connectTimeout: 5000,
        }),
      }),
    );
    expect(add).toHaveBeenCalledWith(
      'notification-delivery',
      { notificationId: 'n1', correlationId: 'request-1' },
      expect.objectContaining({
        jobId: 'notification-n1',
        attempts: 1,
      }),
    );
    expect(result).toEqual({
      enqueued: true,
      notificationId: 'n1',
      jobId: 'notification-n1',
    });
  });

  it('keeps queue disabled without constructing a Redis queue', async () => {
    config.get.mockImplementation((key: string) => {
      if (key === 'notificationQueue.enabled') return false;
      return undefined;
    });

    const service = new NotificationQueueService(config as never);
    service.onModuleInit();

    await expect(service.enqueueNotification('n1')).resolves.toEqual({
      enqueued: false,
      notificationId: 'n1',
      reason: 'QUEUE_DISABLED',
    });
    expect(Queue).not.toHaveBeenCalled();
    expect(add).not.toHaveBeenCalled();
  });

  it('does not fail the originating notification write when Redis enqueue fails', async () => {
    add.mockRejectedValue(new Error('redis unavailable'));
    const service = new NotificationQueueService(config as never);
    service.onModuleInit();

    await expect(service.enqueueNotification('n1')).resolves.toEqual({
      enqueued: false,
      notificationId: 'n1',
      reason: 'ENQUEUE_FAILED',
    });
  });

  it('reports queue counts, lag, and worker heartbeat separately from fallback readiness', async () => {
    redisGet.mockResolvedValue(String(Date.now()));
    const service = new NotificationQueueService(config as never);
    service.onModuleInit();

    const snapshot = await service.getHealthSnapshot();

    expect(snapshot).toEqual(
      expect.objectContaining({
        status: 'READY',
        redis: 'AVAILABLE',
        worker: 'AVAILABLE',
        counts: {
          waiting: 3,
          active: 1,
          completed: 8,
          failed: 2,
          delayed: 4,
        },
      }),
    );
    expect(snapshot.oldestWaitingJobAgeMs).toBeGreaterThanOrEqual(0);
  });
});
