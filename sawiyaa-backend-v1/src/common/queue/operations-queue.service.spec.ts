import { Queue } from 'bullmq';
import {
  DAILY_ATTENDANCE_RECONCILIATION_JOB_NAME,
  OPERATIONS_QUEUE_NAME,
  dailyAttendanceReconciliationJobId,
} from './operations-queue.constants';
import { OperationsQueueService } from './operations-queue.service';

jest.mock('bullmq', () => ({
  Queue: jest.fn(),
}));

describe('OperationsQueueService', () => {
  const add = jest.fn();
  const close = jest.fn();
  const getJob = jest.fn();
  const getJobCounts = jest.fn();
  const getJobs = jest.fn();
  const on = jest.fn();
  const redisGet = jest.fn();
  const config = {
    get: jest.fn((key: string) => {
      const values: Record<string, unknown> = {
        'operationsQueue.enabled': true,
        'operationsQueue.redisUrl': 'redis://queue.example:6379',
        'operationsQueue.prefix': 'sawiyaa:operations',
        'operationsQueue.connectionTimeoutMs': 5000,
        'operationsQueue.dailyAttendanceConcurrency': 1,
        'operationsQueue.heartbeatIntervalMs': 10000,
      };
      return values[key];
    }),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    config.get.mockImplementation((key: string) => {
      const values: Record<string, unknown> = {
        'operationsQueue.enabled': true,
        'operationsQueue.redisUrl': 'redis://queue.example:6379',
        'operationsQueue.prefix': 'sawiyaa:operations',
        'operationsQueue.connectionTimeoutMs': 5000,
        'operationsQueue.dailyAttendanceConcurrency': 1,
        'operationsQueue.heartbeatIntervalMs': 10000,
      };
      return values[key];
    });
    add.mockResolvedValue({ id: 'daily-attendance-session-1-1' });
    close.mockResolvedValue(undefined);
    getJob.mockResolvedValue(null);
    getJobCounts.mockResolvedValue({
      waiting: 1,
      active: 0,
      completed: 2,
      failed: 0,
      delayed: 0,
    });
    getJobs.mockResolvedValue([{ timestamp: Date.now() - 1000 }]);
    redisGet.mockResolvedValue(null);
    (Queue as jest.Mock).mockImplementation(() => ({
      add,
      close,
      getJob,
      getJobCounts,
      getJobs,
      on,
      client: Promise.resolve({ get: redisGet }),
    }));
  });

  it('publishes a minimal versioned job with a BullMQ-valid deterministic id', async () => {
    const service = new OperationsQueueService(config as never);
    service.onModuleInit();

    await expect(
      service.enqueueDailyAttendance('session-1', 1),
    ).resolves.toEqual({
      enqueued: true,
      sessionId: 'session-1',
      observationVersion: 1,
      jobId: 'daily-attendance-session-1-1',
    });

    expect(Queue).toHaveBeenCalledWith(
      OPERATIONS_QUEUE_NAME,
      expect.objectContaining({ prefix: 'sawiyaa:operations' }),
    );
    expect(add).toHaveBeenCalledWith(
      DAILY_ATTENDANCE_RECONCILIATION_JOB_NAME,
      { sessionId: 'session-1', observationVersion: 1 },
      expect.objectContaining({
        jobId: dailyAttendanceReconciliationJobId({
          sessionId: 'session-1',
          observationVersion: 1,
        }),
        attempts: 1,
      }),
    );
    expect(dailyAttendanceReconciliationJobId({
      sessionId: 'session-1',
      observationVersion: 1,
    })).not.toContain(':');
  });

  it('does not construct Redis or inline work while the queue is disabled', async () => {
    config.get.mockImplementation((key: string) =>
      key === 'operationsQueue.enabled' ? false : undefined,
    );
    const service = new OperationsQueueService(config as never);
    service.onModuleInit();

    await expect(
      service.enqueueDailyAttendance('session-1', 1),
    ).resolves.toEqual({
      enqueued: false,
      sessionId: 'session-1',
      observationVersion: 1,
      reason: 'QUEUE_DISABLED',
    });
    expect(Queue).not.toHaveBeenCalled();
  });

  it('records enqueue failure without changing the domain result', async () => {
    add.mockRejectedValue(new Error('redis unavailable'));
    const service = new OperationsQueueService(config as never);
    service.onModuleInit();

    await expect(
      service.enqueueDailyAttendance('session-1', 1),
    ).resolves.toEqual({
      enqueued: false,
      sessionId: 'session-1',
      observationVersion: 1,
      reason: 'ENQUEUE_FAILED',
    });
    await expect(service.getHealthSnapshot()).resolves.toEqual(
      expect.objectContaining({
        status: 'DEGRADED',
        lastError: 'redis unavailable',
      }),
    );
  });

  it('keeps API queue initialization non-fatal when Redis configuration is absent', async () => {
    config.get.mockImplementation((key: string) =>
      key === 'operationsQueue.enabled' ? true : undefined,
    );
    const service = new OperationsQueueService(config as never);

    expect(() => service.onModuleInit()).not.toThrow();
    await expect(
      service.enqueueDailyAttendance('session-1', 1),
    ).resolves.toEqual({
      enqueued: false,
      sessionId: 'session-1',
      observationVersion: 1,
      reason: 'ENQUEUE_FAILED',
    });
    await expect(service.getHealthSnapshot()).resolves.toEqual(
      expect.objectContaining({ status: 'DEGRADED', redis: 'UNAVAILABLE' }),
    );
  });
});
