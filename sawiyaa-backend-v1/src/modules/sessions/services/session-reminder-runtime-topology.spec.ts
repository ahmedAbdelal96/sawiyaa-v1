import { ConfigService } from '@nestjs/config';
import { SessionReminderQueueService } from '@common/queue/session-reminder-queue.service';
import { SessionReminderWorkerService } from '../../../worker/session-reminder-worker.service';
import { SessionReminderRedisStagingService } from './session-reminder-redis-staging.service';
import { SessionReminderNotificationSweeperService } from './session-reminder-notification-sweeper.service';

describe('session reminder runtime topology', () => {
  it('keeps the reminder Redis queue disabled and connection-free in DB_ONLY', async () => {
    const service = new SessionReminderQueueService(
      new ConfigService({
        sessionReminderRedis: { mode: 'DB_ONLY', enabled: false },
      }),
    );

    service.onModuleInit();

    await expect(service.getHealthSnapshot()).resolves.toMatchObject({
      enabled: false,
      mode: 'DB_ONLY',
      status: 'DISABLED',
      redis: 'NOT_REQUIRED',
      worker: 'NOT_REQUIRED',
    });
    await expect(
      service.stage({
        data: {
          reminderId: '11111111-1111-4111-8111-111111111111',
          scheduleRevision: 1,
        },
        delayMs: 0,
      }),
    ).resolves.toBe('UNAVAILABLE');

    await service.close();
  });

  it.each(['DB_ONLY', 'REDIS_SHADOW'])(
    'does not start a reminder worker in %s',
    async (mode) => {
      const configuredQueue = new SessionReminderQueueService(
        new ConfigService({
          sessionReminderRedis: {
            mode,
            enabled: mode !== 'DB_ONLY',
            redisUrl: 'redis://127.0.0.1:6379',
          },
        }),
      );
      const queue = {
        isPrimary: jest.fn().mockReturnValue(configuredQueue.isPrimary()),
        isQueueAvailable: jest.fn(),
        createWorker: jest.fn(),
      };
      const service = new SessionReminderWorkerService(
        queue as never,
        {} as never,
      );

      service.onModuleInit();
      await new Promise<void>((resolve) => setImmediate(resolve));

      expect(queue.isPrimary).toHaveBeenCalled();
      expect(queue.isPrimary()).toBe(false);
      expect(queue.isQueueAvailable).not.toHaveBeenCalled();
      expect(queue.createWorker).not.toHaveBeenCalled();
    },
  );

  it('does not start Redis staging or its refill interval when disabled', async () => {
    const repository = { listStageableReminders: jest.fn() };
    const queue = {
      isEnabled: jest.fn().mockReturnValue(false),
      recordRecovery: jest.fn(),
      markStageFailure: jest.fn(),
      markStageSuccess: jest.fn(),
    };
    const logger = { info: jest.fn(), error: jest.fn() };
    const config = new ConfigService({ sessionReminderRedis: {} });
    const service = new SessionReminderRedisStagingService(
      repository as never,
      queue as never,
      logger as never,
      config,
    );

    service.onApplicationBootstrap();
    await expect(service.refillOnce()).resolves.toBe(0);
    expect(repository.listStageableReminders).not.toHaveBeenCalled();

    service.onModuleDestroy();
  });

  it('keeps the PostgreSQL dispatcher active in DB_ONLY', async () => {
    const repository = {
      claimDueReminders: jest.fn().mockResolvedValue({
        reminders: [],
        claimToken: 'claim-token',
      }),
    };
    const queue = { isPrimary: jest.fn().mockReturnValue(false) };
    const service = new SessionReminderNotificationSweeperService(
      repository as never,
      {} as never,
      {} as never,
      new ConfigService({
        sessionReminderDispatch: {
          batchSize: 10,
          maxRowsPerSweep: 10,
          maxDurationMs: 1_000,
          concurrency: 1,
          leaseDurationMs: 60_000,
        },
      }),
      queue as never,
    );

    await expect(service.sweepOnce()).resolves.toBe(0);
    expect(repository.claimDueReminders).toHaveBeenCalledTimes(1);
    expect(queue.isPrimary).toHaveBeenCalled();
  });
});
