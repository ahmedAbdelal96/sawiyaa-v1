import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { execFileSync } from 'node:child_process';
import { SessionReminderQueueService } from './session-reminder-queue.service';
import { SESSION_REMINDER_EXECUTION_QUEUE_NAME } from './session-reminder-queue.constants';

const testRedisUrl =
  process.env.SESSION_REMINDER_QUEUE_TEST_REDIS_URL ?? 'redis://127.0.0.1:6379';
const testRedis = new URL(testRedisUrl);
const testRedisHost = testRedis.hostname;
const testRedisPort = Number.parseInt(testRedis.port || '6379', 10);

function supportsBullMqRedis(): boolean {
  try {
    const info = execFileSync(
      'redis-cli',
      ['-h', testRedisHost, '-p', String(testRedisPort), 'INFO', 'server'],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
    );
    const version = info.match(/redis_version:(\d+)\.(\d+)/);
    return Boolean(version && Number(version[1]) >= 5);
  } catch {
    return false;
  }
}

const describeIfSupported = supportsBullMqRedis() ? describe : describe.skip;

describeIfSupported('SessionReminderQueueService (Redis integration)', () => {
  const prefix = `sawiyaa:test:session-reminders:${process.pid}:${Date.now()}`;
  const config = new ConfigService({
    sessionReminderRedis: {
      enabled: true,
      mode: 'REDIS_SHADOW',
      redisUrl: testRedisUrl,
      prefix,
      connectionTimeoutMs: 2_000,
      workerConcurrency: 1,
      heartbeatIntervalMs: 1_000,
      removeOnCompleteAgeSeconds: 60,
      removeOnCompleteCount: 100,
      removeOnFailAgeSeconds: 60,
      removeOnFailCount: 100,
    },
  });

  let queue: Queue;
  let service: SessionReminderQueueService;

  beforeAll(async () => {
    queue = new Queue(SESSION_REMINDER_EXECUTION_QUEUE_NAME, {
      connection: { host: testRedisHost, port: testRedisPort },
      prefix,
    });
    service = new SessionReminderQueueService(config);
    service.onModuleInit();
    await queue.waitUntilReady();
    await queue.obliterate({ force: true });
  });

  afterAll(async () => {
    await queue.obliterate({ force: true });
    await queue.close();
    await service.close();
  });

  it('collapses concurrent staging attempts to one deterministic job', async () => {
    const data = {
      reminderId: '11111111-1111-4111-8111-111111111111',
      scheduleRevision: 4,
    };
    const results = await Promise.all(
      Array.from({ length: 4 }, () => service.stage({ data, delayMs: 60_000 })),
    );

    const jobs = await queue.getJobs(['waiting', 'delayed']);
    expect(jobs).toHaveLength(1);
    expect(jobs[0]?.id).toBe(
      `session-reminder-${data.reminderId}-r${data.scheduleRevision}`,
    );
    expect(results).toEqual(['ENSURED', 'ENSURED', 'ENSURED', 'ENSURED']);
    await waitFor(
      async () =>
        (await service.getHealthSnapshot()).metrics.duplicateStage === 3,
    );
    expect((await service.getHealthSnapshot()).metrics).toMatchObject({
      candidates: 4,
      staged: 1,
      duplicateStage: 3,
      stageFailures: 0,
    });
  });

  it('keeps identifiers and revision in the transport payload only', async () => {
    const jobs = await queue.getJobs(['waiting', 'delayed']);
    expect(jobs[0]?.data).toEqual({
      reminderId: '11111111-1111-4111-8111-111111111111',
      scheduleRevision: 4,
    });
  });
});

async function waitFor(condition: () => Promise<boolean>, timeoutMs = 3_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await condition()) return;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error('Timed out waiting for BullMQ queue event metrics');
}
