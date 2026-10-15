import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Queue,
  QueueEvents,
  Worker,
  type ConnectionOptions,
  type Processor,
} from 'bullmq';
import {
  SESSION_REMINDER_EXECUTION_JOB_NAME,
  SESSION_REMINDER_EXECUTION_QUEUE_NAME,
  sessionReminderExecutionJobId,
  type SessionReminderExecutionJobData,
} from './session-reminder-queue.constants';

export type SessionReminderQueueHealthSnapshot = {
  enabled: boolean;
  mode: string;
  status: 'READY' | 'DEGRADED' | 'DISABLED';
  redis: 'AVAILABLE' | 'UNAVAILABLE' | 'NOT_REQUIRED';
  worker: 'AVAILABLE' | 'UNKNOWN' | 'NOT_REQUIRED';
  queueName: string;
  counts: {
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  };
  oldestDelayedOrWaitingJobAgeMs: number | null;
  lastStageSuccessAt: string | null;
  lastStageFailureAt: string | null;
  lastExecutionSuccessAt: string | null;
  lastRedisErrorAt: string | null;
  lastWorkerHeartbeatAt: string | null;
  lastError: string | null;
  metrics: {
    candidates: number;
    staged: number;
    duplicateStage: number;
    executions: number;
    noops: number;
    stale: number;
    recovery: number;
    stageFailures: number;
    workerFailures: number;
  };
};

type RuntimeState = {
  lastStageSuccessAt: Date | null;
  lastStageFailureAt: Date | null;
  lastExecutionSuccessAt: Date | null;
  lastRedisErrorAt: Date | null;
  lastWorkerHeartbeatAt: Date | null;
  lastError: string | null;
  metrics: SessionReminderQueueHealthSnapshot['metrics'];
};

@Injectable()
export class SessionReminderQueueService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(SessionReminderQueueService.name);
  private queue: Queue<SessionReminderExecutionJobData> | null = null;
  private queueEvents: QueueEvents | null = null;
  private readonly runtimeState: RuntimeState = {
    lastStageSuccessAt: null,
    lastStageFailureAt: null,
    lastExecutionSuccessAt: null,
    lastRedisErrorAt: null,
    lastWorkerHeartbeatAt: null,
    lastError: null,
    metrics: {
      candidates: 0,
      staged: 0,
      duplicateStage: 0,
      executions: 0,
      noops: 0,
      stale: 0,
      recovery: 0,
      stageFailures: 0,
      workerFailures: 0,
    },
  };

  constructor(private readonly configService: ConfigService) {}

  onModuleInit(): void {
    const mode = this.mode();
    this.logger.log(`Session reminder execution mode: ${mode}`);
    if (mode !== 'DB_ONLY') {
      this.logger.warn(
        `Session reminder Redis mode ${mode} is explicitly enabled for non-default testing or future evaluation`,
      );
    }

    if (!this.isEnabled()) {
      this.logger.log(
        'Session reminder Redis staging is disabled; PostgreSQL dispatcher remains authoritative',
      );
      return;
    }

    const redisUrl = this.redisUrl();
    if (!redisUrl) {
      this.runtimeState.lastRedisErrorAt = new Date();
      this.logger.warn(
        'Session reminder Redis staging is enabled but no Redis URL is configured; PostgreSQL recovery remains active',
      );
      return;
    }

    this.queue = new Queue<SessionReminderExecutionJobData>(
      SESSION_REMINDER_EXECUTION_QUEUE_NAME,
      {
        connection: this.buildConnection(redisUrl, 1),
        prefix: this.prefix(),
        skipWaitingForReady: true,
        defaultJobOptions: this.defaultJobOptions(),
      },
    );
    this.queueEvents = new QueueEvents(SESSION_REMINDER_EXECUTION_QUEUE_NAME, {
      connection: this.buildConnection(redisUrl, null),
      prefix: this.prefix(),
      autorun: false,
    });
    this.queueEvents.on('added', () => {
      this.runtimeState.metrics.staged += 1;
    });
    this.queueEvents.on('duplicated', () => {
      this.runtimeState.metrics.duplicateStage += 1;
    });
    this.queueEvents.on('error', (error) => {
      this.recordRedisError(error);
      this.logger.warn(
        `Session reminder Redis queue events degraded: ${this.safeErrorMessage(error)}`,
      );
    });
    void this.queueEvents.run().catch((error) => {
      this.recordRedisError(error);
    });
    this.queue.on('error', (error) => {
      this.recordRedisError(error);
      this.logger.warn(
        `Session reminder Redis queue degraded: ${this.safeErrorMessage(error)}`,
      );
    });
    this.logger.log(
      `Session reminder Redis queue configured (mode=${this.mode()}, queue=${SESSION_REMINDER_EXECUTION_QUEUE_NAME}, prefix=${this.prefix()})`,
    );
  }

  async onModuleDestroy(): Promise<void> {
    await this.close();
  }

  isEnabled(): boolean {
    return Boolean(
      this.configService.get<boolean>('sessionReminderRedis.enabled'),
    );
  }

  mode(): string {
    return (
      this.configService.get<string>('sessionReminderRedis.mode') ?? 'DB_ONLY'
    );
  }

  isPrimary(): boolean {
    return this.isEnabled() && this.mode() === 'REDIS_PRIMARY_WITH_DB_RECOVERY';
  }

  async stage(input: {
    data: SessionReminderExecutionJobData;
    delayMs: number;
  }): Promise<'ENSURED' | 'UNAVAILABLE' | 'FAILED'> {
    this.runtimeState.metrics.candidates += 1;
    if (!this.isEnabled() || !this.queue) return 'UNAVAILABLE';

    try {
      const jobId = sessionReminderExecutionJobId(input.data);
      const existingJob = await this.queue.getJob(jobId);
      if (existingJob && (await existingJob.getState()) === 'failed') {
        await existingJob.remove();
      }
      await this.queue.add(SESSION_REMINDER_EXECUTION_JOB_NAME, input.data, {
        jobId,
        delay: Math.max(0, Math.floor(input.delayMs)),
        ...this.defaultJobOptions(),
      });
      this.runtimeState.lastStageSuccessAt = new Date();
      return 'ENSURED';
    } catch (error) {
      this.runtimeState.metrics.stageFailures += 1;
      this.recordRedisError(error);
      return 'FAILED';
    }
  }

  createWorker<TResult>(
    processor: Processor<SessionReminderExecutionJobData, TResult>,
  ): Worker<SessionReminderExecutionJobData, TResult> {
    if (!this.isPrimary()) {
      throw new Error(
        'Cannot create the session reminder worker outside primary mode',
      );
    }
    return new Worker<SessionReminderExecutionJobData, TResult>(
      SESSION_REMINDER_EXECUTION_QUEUE_NAME,
      processor,
      {
        connection: this.buildConnection(this.redisUrlOrThrow(), null),
        prefix: this.prefix(),
        name: 'sawiyaa-session-reminder-worker',
        concurrency: this.workerConcurrency(),
        maxStalledCount: 1,
        ...this.defaultJobOptions(),
      },
    );
  }

  recordExecution(outcome: 'SUCCESS' | 'NOOP' | 'STALE' | 'RECOVERY'): void {
    this.runtimeState.metrics.executions += 1;
    if (outcome === 'NOOP') this.runtimeState.metrics.noops += 1;
    if (outcome === 'STALE') this.runtimeState.metrics.stale += 1;
    if (outcome === 'RECOVERY') this.runtimeState.metrics.recovery += 1;
    if (outcome === 'SUCCESS')
      this.runtimeState.lastExecutionSuccessAt = new Date();
  }

  recordRecovery(): void {
    this.runtimeState.metrics.recovery += 1;
  }

  recordWorkerHeartbeat(): void {
    this.runtimeState.lastWorkerHeartbeatAt = new Date();
    if (!this.queue) return;
    void this.queue.client
      .then((client) =>
        (
          client as unknown as {
            set: (
              key: string,
              value: string,
              mode: 'PX',
              ttl: number,
            ) => Promise<unknown>;
          }
        ).set(
          this.workerHeartbeatKey(),
          String(Date.now()),
          'PX',
          this.heartbeatIntervalMs() * 3,
        ),
      )
      .catch((error) => this.recordRedisError(error));
  }

  recordWorkerError(error: unknown): void {
    this.runtimeState.metrics.workerFailures += 1;
    this.recordRedisError(error);
  }

  async getHealthSnapshot(): Promise<SessionReminderQueueHealthSnapshot> {
    const base = this.baseHealthSnapshot();
    if (!this.isEnabled()) return base;
    if (!this.queue) {
      return { ...base, status: 'DEGRADED', redis: 'UNAVAILABLE' };
    }
    try {
      const counts = await this.queue.getJobCounts(
        'waiting',
        'active',
        'completed',
        'failed',
        'delayed',
      );
      const jobs = await this.queue.getJobs(
        ['waiting', 'delayed'],
        0,
        49,
        true,
      );
      const oldest = jobs.reduce<number | null>(
        (value, job) =>
          value === null ? job.timestamp : Math.min(value, job.timestamp),
        null,
      );
      const worker = await this.readWorkerHeartbeat();
      const stageHealthy =
        this.runtimeState.lastStageFailureAt === null ||
        (this.runtimeState.lastStageSuccessAt !== null &&
          this.runtimeState.lastStageSuccessAt >=
            this.runtimeState.lastStageFailureAt);
      return {
        ...base,
        status: stageHealthy ? 'READY' : 'DEGRADED',
        redis: 'AVAILABLE',
        worker,
        counts: {
          waiting: counts.waiting ?? 0,
          active: counts.active ?? 0,
          completed: counts.completed ?? 0,
          failed: counts.failed ?? 0,
          delayed: counts.delayed ?? 0,
        },
        oldestDelayedOrWaitingJobAgeMs:
          oldest === null ? null : Math.max(0, Date.now() - oldest),
      };
    } catch (error) {
      this.recordRedisError(error);
      return { ...base, status: 'DEGRADED', redis: 'UNAVAILABLE' };
    }
  }

  async isExecutionHealthy(): Promise<boolean> {
    if (!this.isPrimary()) return false;
    const snapshot = await this.getHealthSnapshot();
    if (snapshot.status !== 'READY' || snapshot.worker !== 'AVAILABLE')
      return false;
    const heartbeat = snapshot.lastWorkerHeartbeatAt;
    return Boolean(
      heartbeat &&
      Date.now() - new Date(heartbeat).getTime() <=
        this.heartbeatIntervalMs() * 3,
    );
  }

  async isQueueAvailable(): Promise<boolean> {
    if (!this.isPrimary()) return false;
    const snapshot = await this.getHealthSnapshot();
    return snapshot.redis === 'AVAILABLE';
  }

  markStageSuccess(): void {
    this.runtimeState.lastStageSuccessAt = new Date();
  }

  markStageFailure(): void {
    this.runtimeState.lastStageFailureAt = new Date();
  }

  async close(): Promise<void> {
    await this.queueEvents?.close();
    this.queueEvents = null;
    await this.queue?.close();
    this.queue = null;
  }

  private defaultJobOptions() {
    return {
      attempts: 1,
      removeOnComplete: {
        age: this.integerConfig('removeOnCompleteAgeSeconds', 86_400),
        count: this.integerConfig('removeOnCompleteCount', 10_000),
      },
      removeOnFail: {
        age: this.integerConfig('removeOnFailAgeSeconds', 604_800),
        count: this.integerConfig('removeOnFailCount', 10_000),
      },
    } as const;
  }

  private redisUrl(): string | undefined {
    return this.configService
      .get<string>('sessionReminderRedis.redisUrl')
      ?.trim();
  }

  private redisUrlOrThrow(): string {
    const value = this.redisUrl();
    if (!value)
      throw new Error(
        'A Redis URL is required for the session reminder worker',
      );
    return value;
  }

  private prefix(): string {
    return (
      this.configService.get<string>('sessionReminderRedis.prefix') ??
      'sawiyaa:session-reminders'
    );
  }

  private workerConcurrency(): number {
    return Math.min(
      50,
      Math.max(1, this.integerConfig('workerConcurrency', 10)),
    );
  }

  private heartbeatIntervalMs(): number {
    return Math.min(
      60_000,
      Math.max(1_000, this.integerConfig('heartbeatIntervalMs', 10_000)),
    );
  }

  private integerConfig(key: string, fallback: number): number {
    const value = this.configService.get<number>(`sessionReminderRedis.${key}`);
    return typeof value === 'number' && Number.isFinite(value)
      ? Math.floor(value)
      : fallback;
  }

  private buildConnection(
    redisUrl: string,
    maxRetriesPerRequest: number | null,
  ): ConnectionOptions {
    const parsed = new URL(redisUrl);
    const username = parsed.username
      ? decodeURIComponent(parsed.username)
      : undefined;
    const password = parsed.password
      ? decodeURIComponent(parsed.password)
      : undefined;
    const database = parsed.pathname.replace(/^\//, '');
    return {
      host: parsed.hostname,
      port: parsed.port ? Number.parseInt(parsed.port, 10) : 6379,
      ...(username ? { username } : {}),
      ...(password ? { password } : {}),
      ...(database ? { db: Number.parseInt(database, 10) } : {}),
      ...(parsed.protocol === 'rediss:' ? { tls: {} } : {}),
      connectTimeout: Math.max(
        100,
        this.integerConfig('connectionTimeoutMs', 10_000),
      ),
      maxRetriesPerRequest,
      retryStrategy: (times: number) => Math.min(times * 250, 5_000),
    } as ConnectionOptions;
  }

  private async readWorkerHeartbeat(): Promise<
    'AVAILABLE' | 'UNKNOWN' | 'NOT_REQUIRED'
  > {
    if (!this.isPrimary()) return 'NOT_REQUIRED';
    if (!this.queue) return 'UNKNOWN';
    try {
      const client = await this.queue.client;
      const value = await (
        client as unknown as { get: (key: string) => Promise<string | null> }
      ).get(this.workerHeartbeatKey());
      if (!value) return 'UNKNOWN';
      const timestamp = Number.parseInt(value, 10);
      if (Number.isFinite(timestamp))
        this.runtimeState.lastWorkerHeartbeatAt = new Date(timestamp);
      return 'AVAILABLE';
    } catch {
      return 'UNKNOWN';
    }
  }

  private recordRedisError(error: unknown): void {
    this.runtimeState.lastRedisErrorAt = new Date();
    this.runtimeState.lastStageFailureAt = new Date();
    this.runtimeState.lastError = this.safeErrorMessage(error);
    this.logger.debug(
      `Session reminder Redis error: ${this.runtimeState.lastError}`,
    );
  }

  private safeErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message.slice(0, 300) : 'REDIS_ERROR';
  }

  private workerHeartbeatKey(): string {
    return `${this.prefix()}:worker-heartbeat`;
  }

  private baseHealthSnapshot(): SessionReminderQueueHealthSnapshot {
    return {
      enabled: this.isEnabled(),
      mode: this.mode(),
      status: this.isEnabled() ? 'DEGRADED' : 'DISABLED',
      redis: this.isEnabled() ? 'UNAVAILABLE' : 'NOT_REQUIRED',
      worker: this.isPrimary() ? 'UNKNOWN' : 'NOT_REQUIRED',
      queueName: SESSION_REMINDER_EXECUTION_QUEUE_NAME,
      counts: { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 },
      oldestDelayedOrWaitingJobAgeMs: null,
      lastStageSuccessAt:
        this.runtimeState.lastStageSuccessAt?.toISOString() ?? null,
      lastStageFailureAt:
        this.runtimeState.lastStageFailureAt?.toISOString() ?? null,
      lastExecutionSuccessAt:
        this.runtimeState.lastExecutionSuccessAt?.toISOString() ?? null,
      lastRedisErrorAt:
        this.runtimeState.lastRedisErrorAt?.toISOString() ?? null,
      lastWorkerHeartbeatAt:
        this.runtimeState.lastWorkerHeartbeatAt?.toISOString() ?? null,
      lastError: this.runtimeState.lastError,
      metrics: { ...this.runtimeState.metrics },
    };
  }
}
