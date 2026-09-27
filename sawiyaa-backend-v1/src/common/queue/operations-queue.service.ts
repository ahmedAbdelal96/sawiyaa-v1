import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Queue,
  Worker,
  type ConnectionOptions,
  type Processor,
  type WorkerOptions,
} from 'bullmq';
import {
  DAILY_ATTENDANCE_RECONCILIATION_JOB_NAME,
  dailyAttendanceReconciliationJobId,
  OPERATIONS_QUEUE_NAME,
  type DailyAttendanceQueuePublishResult,
  type DailyAttendanceReconciliationJobData,
} from './operations-queue.constants';

export type OperationsQueueHealthSnapshot = {
  enabled: boolean;
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
  oldestWaitingJobAgeMs: number | null;
  lastEnqueuedAt: string | null;
  lastEnqueueFailureAt: string | null;
  lastWorkerHeartbeatAt: string | null;
  lastError: string | null;
};

@Injectable()
export class OperationsQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OperationsQueueService.name);
  private queue: Queue<DailyAttendanceReconciliationJobData> | null = null;
  private readonly runtimeState = {
    lastEnqueuedAt: null as Date | null,
    lastEnqueueFailureAt: null as Date | null,
    lastWorkerHeartbeatAt: null as Date | null,
    lastError: null as string | null,
  };

  constructor(private readonly configService: ConfigService) {}

  onModuleInit(): void {
    if (!this.isDailyAttendanceEnabled()) {
      this.logger.log(
        'Daily attendance operations queue is disabled; synchronous sweeper rollback remains active',
      );
      return;
    }

    const redisUrl = this.redisUrl();
    if (!redisUrl) {
      this.runtimeState.lastError =
        'OPERATIONS_QUEUE_REDIS_URL, NOTIFICATION_QUEUE_REDIS_URL, or REDIS_URL is required';
      this.logger.error(
        'Daily attendance operations queue is enabled but no Redis URL is configured; API remains available and eligible sessions remain recoverable',
      );
      return;
    }

    this.queue = new Queue<DailyAttendanceReconciliationJobData>(
      OPERATIONS_QUEUE_NAME,
      {
        connection: this.buildConnection(redisUrl, 1),
        prefix: this.prefix(),
        skipWaitingForReady: true,
        defaultJobOptions: {
          attempts: 1,
          removeOnComplete: { age: 86_400, count: 10_000 },
          removeOnFail: { age: 604_800, count: 10_000 },
        },
      },
    );
    this.queue.on('error', (error) => {
      this.recordWorkerError(error);
      this.logger.warn(
        `Daily attendance operations queue is degraded (${this.safeErrorMessage(error)})`,
      );
    });
    this.logger.log(
      `Daily attendance operations queue configured (queue=${OPERATIONS_QUEUE_NAME}, prefix=${this.prefix()}, concurrency=${this.workerConcurrency()})`,
    );
  }

  async onModuleDestroy(): Promise<void> {
    await this.close();
  }

  isDailyAttendanceEnabled(): boolean {
    return Boolean(this.configService.get<boolean>('operationsQueue.enabled'));
  }

  async enqueueDailyAttendance(
    sessionId: string,
    observationVersion: number,
  ): Promise<DailyAttendanceQueuePublishResult> {
    const base = { sessionId, observationVersion };
    if (!this.isDailyAttendanceEnabled()) {
      return { ...base, enqueued: false, reason: 'QUEUE_DISABLED' };
    }

    const jobId = dailyAttendanceReconciliationJobId(base);
    const startedAt = Date.now();
    try {
      const queue = this.getQueue();
      const existing = await queue.getJob(jobId);
      if (existing) {
        const state = await existing.getState();
        if (state === 'failed') {
          await existing.remove();
        } else {
          this.runtimeState.lastEnqueuedAt = new Date();
          this.logger.debug(
            `daily_attendance_enqueue_completed sessionId=${sessionId} observationVersion=${observationVersion} deduplicated=true durationMs=${Date.now() - startedAt}`,
          );
          return { ...base, enqueued: true, jobId };
        }
      }
      await queue.add(
        DAILY_ATTENDANCE_RECONCILIATION_JOB_NAME,
        base,
        {
          jobId,
          attempts: 1,
          removeOnComplete: { age: 86_400, count: 10_000 },
          removeOnFail: { age: 604_800, count: 10_000 },
        },
      );
      this.runtimeState.lastEnqueuedAt = new Date();
      this.runtimeState.lastError = null;
      this.logger.debug(
        `daily_attendance_enqueue_completed sessionId=${sessionId} observationVersion=${observationVersion} deduplicated=false durationMs=${Date.now() - startedAt}`,
      );
      return { ...base, enqueued: true, jobId };
    } catch (error) {
      this.runtimeState.lastEnqueueFailureAt = new Date();
      this.runtimeState.lastError = this.safeErrorMessage(error);
      this.logger.warn(
        `Daily attendance job ${jobId} could not be enqueued; session remains eligible for a later sweep (${this.runtimeState.lastError}) durationMs=${Date.now() - startedAt}`,
      );
      return { ...base, enqueued: false, reason: 'ENQUEUE_FAILED' };
    }
  }

  createDailyAttendanceWorker<TResult>(
    processor: Processor<DailyAttendanceReconciliationJobData, TResult>,
  ): Worker<DailyAttendanceReconciliationJobData, TResult> {
    if (!this.isDailyAttendanceEnabled()) {
      throw new Error(
        'Cannot create the Daily attendance worker while the operations queue is disabled',
      );
    }
    return new Worker<DailyAttendanceReconciliationJobData, TResult>(
      OPERATIONS_QUEUE_NAME,
      processor,
      {
        connection: this.buildConnection(this.redisUrlOrThrow(), null),
        prefix: this.prefix(),
        name: 'sawiyaa-daily-attendance-worker',
        concurrency: this.workerConcurrency(),
        maxStalledCount: 1,
        removeOnComplete: { age: 86_400, count: 10_000 },
        removeOnFail: { age: 604_800, count: 10_000 },
      } satisfies WorkerOptions,
    );
  }

  getWorkerHeartbeatIntervalMs(): number {
    const configured = this.configService.get<number>(
      'operationsQueue.heartbeatIntervalMs',
    );
    return Math.min(60_000, Math.max(1_000, configured ?? 10_000));
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
          this.getWorkerHeartbeatIntervalMs() * 3,
        ),
      )
      .catch((error) => this.recordWorkerError(error));
  }

  recordWorkerError(error: unknown): void {
    this.runtimeState.lastError = this.safeErrorMessage(error);
  }

  async getHealthSnapshot(): Promise<OperationsQueueHealthSnapshot> {
    const base = this.baseHealthSnapshot();
    if (!this.isDailyAttendanceEnabled()) return base;
    if (!this.queue) {
      return {
        ...base,
        status: 'DEGRADED',
        redis: 'UNAVAILABLE',
        lastError: this.runtimeState.lastError ?? 'QUEUE_NOT_INITIALIZED',
      };
    }
    try {
      const counts = await this.queue.getJobCounts(
        'waiting',
        'active',
        'completed',
        'failed',
        'delayed',
      );
      const waitingJobs = await this.queue.getJobs(['waiting'], 0, 49, true);
      const oldestWaitingTimestamp = waitingJobs.reduce<number | null>(
        (oldest, job) =>
          oldest === null ? job.timestamp : Math.min(oldest, job.timestamp),
        null,
      );
      const worker = await this.readWorkerHeartbeat();
      const enqueueDegraded =
        this.runtimeState.lastEnqueueFailureAt !== null &&
        (this.runtimeState.lastEnqueuedAt === null ||
          this.runtimeState.lastEnqueueFailureAt.getTime() >=
            this.runtimeState.lastEnqueuedAt.getTime());
      return {
        ...base,
        status: enqueueDegraded ? 'DEGRADED' : 'READY',
        redis: 'AVAILABLE',
        worker,
        counts: {
          waiting: counts.waiting ?? 0,
          active: counts.active ?? 0,
          completed: counts.completed ?? 0,
          failed: counts.failed ?? 0,
          delayed: counts.delayed ?? 0,
        },
        oldestWaitingJobAgeMs:
          oldestWaitingTimestamp === null
            ? null
            : Math.max(0, Date.now() - oldestWaitingTimestamp),
      };
    } catch (error) {
      this.recordWorkerError(error);
      return {
        ...base,
        status: 'DEGRADED',
        redis: 'UNAVAILABLE',
        lastError: this.runtimeState.lastError,
      };
    }
  }

  async close(): Promise<void> {
    if (!this.queue) return;
    await this.queue.close();
    this.queue = null;
  }

  private getQueue(): Queue<DailyAttendanceReconciliationJobData> {
    if (!this.queue) {
      throw new Error('Operations BullMQ queue is not initialized');
    }
    return this.queue;
  }

  private baseHealthSnapshot(): OperationsQueueHealthSnapshot {
    return {
      enabled: this.isDailyAttendanceEnabled(),
      status: this.isDailyAttendanceEnabled() ? 'DEGRADED' : 'DISABLED',
      redis: this.isDailyAttendanceEnabled() ? 'UNAVAILABLE' : 'NOT_REQUIRED',
      worker: this.isDailyAttendanceEnabled() ? 'UNKNOWN' : 'NOT_REQUIRED',
      queueName: OPERATIONS_QUEUE_NAME,
      counts: { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 },
      oldestWaitingJobAgeMs: null,
      lastEnqueuedAt: this.runtimeState.lastEnqueuedAt?.toISOString() ?? null,
      lastEnqueueFailureAt:
        this.runtimeState.lastEnqueueFailureAt?.toISOString() ?? null,
      lastWorkerHeartbeatAt:
        this.runtimeState.lastWorkerHeartbeatAt?.toISOString() ?? null,
      lastError: this.runtimeState.lastError,
    };
  }

  private redisUrl(): string | undefined {
    return this.configService.get<string>('operationsQueue.redisUrl')?.trim();
  }

  private redisUrlOrThrow(): string {
    const value = this.redisUrl();
    if (!value) {
      throw new Error(
        'Operations queue Redis URL is required when Daily attendance queue is enabled',
      );
    }
    return value;
  }

  private prefix(): string {
    return (
      this.configService.get<string>('operationsQueue.prefix') ??
      'sawiyaa:operations'
    );
  }

  private workerConcurrency(): number {
    const configured = this.configService.get<number>(
      'operationsQueue.dailyAttendanceConcurrency',
    );
    return Math.min(4, Math.max(1, configured ?? 1));
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
        this.configService.get<number>('operationsQueue.connectionTimeoutMs') ??
          10_000,
      ),
      maxRetriesPerRequest,
      retryStrategy: (times: number) => Math.min(times * 250, 5_000),
    } as ConnectionOptions;
  }

  private workerHeartbeatKey(): string {
    return `${this.prefix()}:worker-heartbeat`;
  }

  private async readWorkerHeartbeat(): Promise<'AVAILABLE' | 'UNKNOWN'> {
    if (!this.queue) return 'UNKNOWN';
    try {
      const value = await (
        (await this.queue.client) as unknown as {
          get: (key: string) => Promise<string | null>;
        }
      ).get(this.workerHeartbeatKey());
      return value ? 'AVAILABLE' : 'UNKNOWN';
    } catch (error) {
      this.recordWorkerError(error);
      return 'UNKNOWN';
    }
  }

  private safeErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message.slice(0, 300) : 'QUEUE_ERROR';
  }
}
