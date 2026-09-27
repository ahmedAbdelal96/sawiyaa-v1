import { Job, Queue, QueueEvents, Worker } from 'bullmq';
import { createClient } from 'redis';
import { notificationJobId } from './notification-queue.constants';

const describeIntegration =
  process.env.RUN_NOTIFICATION_QUEUE_INTEGRATION === 'true'
    ? describe
    : describe.skip;

describeIntegration('BullMQ notifications queue integration', () => {
  jest.setTimeout(20_000);

  it('processes a notification id once and deduplicates a repeated job id', async () => {
    const redisProbe = createClient({
      url:
        process.env.NOTIFICATION_QUEUE_TEST_REDIS_URL ??
        'redis://127.0.0.1:6379',
    });
    redisProbe.on('error', () => undefined);
    await redisProbe.connect();
    const serverInfo = await redisProbe.sendCommand(['INFO', 'server']);
    await redisProbe.quit();
    const version = /redis_version:(\d+)\./.exec(serverInfo)?.[1];
    if (!version || Number.parseInt(version, 10) < 5) {
      console.warn(
        `BullMQ integration skipped: Redis ${version ?? 'unknown'} is below the supported Redis 5 minimum`,
      );
      return;
    }

    const queueName = 'notifications';
    const prefix = `sawiyaa:test:notifications:${process.pid}:${Date.now()}`;
    const connection = {
      host: '127.0.0.1',
      port: 6379,
      maxRetriesPerRequest: 1,
    };
    const queue = new Queue(queueName, {
      connection,
      prefix,
      defaultJobOptions: { removeOnComplete: false },
    });
    const events = new QueueEvents(queueName, { connection, prefix });
    const deliveredNotificationIds: string[] = [];
    const worker = new Worker(
      queueName,
      async (job: Job<{ notificationId: string }>) => {
        deliveredNotificationIds.push(job.data.notificationId);
        return { persisted: true };
      },
      { connection, prefix, concurrency: 1 },
    );

    try {
      await Promise.all([
        queue.waitUntilReady(),
        events.waitUntilReady(),
        worker.waitUntilReady(),
      ]);

      const first = await queue.add(
        'notification-delivery',
        { notificationId: 'notification-integration-1' },
        { jobId: notificationJobId('notification-integration-1') },
      );
      await first.waitUntilFinished(events, 10_000);

      const repeated = await queue.add(
        'notification-delivery',
        { notificationId: 'notification-integration-1' },
        { jobId: notificationJobId('notification-integration-1') },
      );

      expect(repeated.id).toBe(first.id);
      expect(deliveredNotificationIds).toEqual([
        'notification-integration-1',
      ]);
    } finally {
      await worker.close();
      await events.close();
      await queue.obliterate({ force: true });
      await queue.close();
    }
  });
});
