import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Queue,
  Worker,
  type ConnectionOptions,
  type Processor,
  type WorkerOptions,
} from 'bullmq';
import {
  NOTIFICATION_DELIVERY_JOB_NAME,
  notificationQueueLaneForChannel,
  notificationQueueName,
  type NotificationQueueLane,
  notificationJobId,
  type NotificationDeliveryJobData,
  type NotificationQueuePublishResult,
} from './notification-queue.constants';

export type NotificationQueueHealthSnapshot = {
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

type QueueRuntimeState = {
  lastEnqueuedAt: Date | null;
  lastEnqueueFailureAt: Date | null;
  lastWorkerHeartbeatAt: Date | null;
  lastError: string | null;
};

@Injectable()
export class NotificationQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NotificationQueueService.name);
  private readonly queues = new Map<
    NotificationQueueLane,
    Queue<NotificationDeliveryJobData>
  >();
  private connection: ConnectionOptions | null = null;
  private readonly runtimeState: QueueRuntimeState = {
    lastEnqueuedAt: null,
    lastEnqueueFailureAt: null,
    lastWorkerHeartbeatAt: null,
    lastError: null,
  };

  constructor(private readonly configService: ConfigService) {}

  onModuleInit(): void {
    if (!this.isEnabled()) {
      this.logger.log(
        'Notification BullMQ queue is disabled; DB fallback remains active',
      );
      return;
    }

    const redisUrl = this.redisUrl();
    if (!redisUrl) {
      throw new Error(
        'NOTIFICATION_QUEUE_REDIS_URL or REDIS_URL is required when NOTIFICATION_QUEUE_ENABLED=true',
      );
    }

    // Producers/health checks fail fast when Redis is unavailable. Workers use
    // their own connection with BullMQ's required unlimited request retry mode.
    this.connection = this.buildConnection(redisUrl, 1);
    for (const lane of ['DEFAULT', 'EMAIL', 'PUSH'] as const) {
      const queue = new Queue<NotificationDeliveryJobData>(
        notificationQueueName(lane),
        {
          connection: this.connection,
          prefix: this.prefix(),
          skipWaitingForReady: true,
          defaultJobOptions: {
            // Provider/domain retry policy remains in the Notification row. A
            // BullMQ retry is reserved for an infrastructure exception only.
            attempts: 1,
            removeOnComplete: { age: 86_400, count: 10_000 },
            removeOnFail: { age: 604_800, count: 10_000 },
          },
        },
      );
      queue.on('error', (error) => {
        this.recordWorkerError(error);
        this.logger.warn(
          `Notification queue connection is degraded; DB fallback remains active (${this.safeErrorMessage(error)})`,
        );
      });
      this.queues.set(lane, queue);
    }
    this.logger.log(
      `Notification BullMQ queues configured (lanes=EMAIL,PUSH,DEFAULT, prefix=${this.prefix()}, concurrency=${this.workerConcurrency()})`,
    );
  }

  async onModuleDestroy(): Promise<void> {
    await this.close();
  }

  isEnabled(): boolean {
    return Boolean(
      this.configService.get<boolean>('notificationQueue.enabled'),
    );
  }

  async enqueueNotification(
    notificationId: string,
    metadata?: { correlationId?: string; channel?: string | null },
  ): Promise<NotificationQueuePublishResult> {
    if (!this.isEnabled()) {
      return {
        enqueued: false,
        notificationId,
        reason: 'QUEUE_DISABLED',
      };
    }

    const jobId = notificationJobId(notificationId);
    const data: NotificationDeliveryJobData = {
      notificationId,
      ...(metadata?.correlationId
        ? { correlationId: metadata.correlationId }
        : {}),
    };

    try {
      const queue = this.getQueue(
        notificationQueueLaneForChannel(metadata?.channel),
      );
      await queue.add(NOTIFICATION_DELIVERY_JOB_NAME, data, {
        jobId,
        attempts: 1,
        removeOnComplete: { age: 86_400, count: 10_000 },
        removeOnFail: { age: 604_800, count: 10_000 },
      });
      this.runtimeState.lastEnqueuedAt = new Date();
      this.runtimeState.lastError = null;
      return { enqueued: true, notificationId, jobId };
    } catch (error) {
      this.runtimeState.lastEnqueueFailureAt = new Date();
      this.runtimeState.lastError = this.safeErrorMessage(error);
      this.logger.warn(
        `Notification ${notificationId} could not be enqueued; DB fallback remains authoritative (${this.runtimeState.lastError})`,
      );
      return { enqueued: false, notificationId, reason: 'ENQUEUE_FAILED' };
    }
  }

  createWorkers<TResult>(
    processor: Processor<NotificationDeliveryJobData, TResult>,
  ): Array<Worker<NotificationDeliveryJobData, TResult>> {
    if (!this.isEnabled()) {
      throw new Error(
        'Cannot create the notification worker while the queue is disabled',
      );
    }

    return (['DEFAULT', 'EMAIL', 'PUSH'] as const).map((lane) => {
      const connection = this.buildConnection(this.redisUrlOrThrow(), null);
      return new Worker<NotificationDeliveryJobData, TResult>(
        notificationQueueName(lane),
        processor,
        {
          connection,
          prefix: this.prefix(),
          name: `sawiyaa-notification-worker-${lane.toLowerCase()}`,
          concurrency: this.laneWorkerConcurrency(lane),
          // Keep stalled recovery bounded. The job itself is idempotently
          // claimed in PostgreSQL before the delivery engine is invoked.
          maxStalledCount: 1,
          removeOnComplete: { age: 86_400, count: 10_000 },
          removeOnFail: { age: 604_800, count: 10_000 },
        } satisfies WorkerOptions,
      );
    });
  }

  recordWorkerHeartbeat(): void {
    this.runtimeState.lastWorkerHeartbeatAt = new Date();
    if (this.queues.size === 0) return;

    const queue = this.queues.get('DEFAULT');
    if (!queue) return;
    void queue.client
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

  getWorkerHeartbeatIntervalMs(): number {
    const configured = this.configService.get<number>(
      'notificationQueue.heartbeatIntervalMs',
    );
    return Math.min(60_000, Math.max(1_000, configured ?? 10_000));
  }

  recordWorkerError(error: unknown): void {
    this.runtimeState.lastError = this.safeErrorMessage(error);
  }

  async getHealthSnapshot(): Promise<NotificationQueueHealthSnapshot> {
    const base = this.baseHealthSnapshot();
    if (!this.isEnabled()) {
      return base;
    }

    const queues = [...this.queues.values()];
    if (queues.length === 0) {
      return {
        ...base,
        status: 'DEGRADED',
        redis: 'UNAVAILABLE',
        lastError: this.runtimeState.lastError ?? 'QUEUE_NOT_INITIALIZED',
      };
    }

    try {
      const counts = await Promise.all(
        queues.map((queue) =>
          queue.getJobCounts(
            'waiting',
            'active',
            'completed',
            'failed',
            'delayed',
          ),
        ),
      );
      const waitingJobs = (
        await Promise.all(
          queues.map((queue) => queue.getJobs(['waiting'], 0, 49, true)),
        )
      ).flat();
      const oldestWaitingTimestamp = waitingJobs.reduce<number | null>(
        (oldest, job) =>
          oldest === null ? job.timestamp : Math.min(oldest, job.timestamp),
        null,
      );

      const workerStatus = await this.readWorkerHeartbeat();
      const snapshot: NotificationQueueHealthSnapshot = {
        ...base,
        status: 'READY',
        redis: 'AVAILABLE',
        worker: workerStatus,
        lastWorkerHeartbeatAt:
          this.runtimeState.lastWorkerHeartbeatAt?.toISOString() ?? null,
        counts: {
          waiting: counts.reduce(
            (total, count) => total + (count.waiting ?? 0),
            0,
          ),
          active: counts.reduce(
            (total, count) => total + (count.active ?? 0),
            0,
          ),
          completed: counts.reduce(
            (total, count) => total + (count.completed ?? 0),
            0,
          ),
          failed: counts.reduce(
            (total, count) => total + (count.failed ?? 0),
            0,
          ),
          delayed: counts.reduce(
            (total, count) => total + (count.delayed ?? 0),
            0,
          ),
        },
        oldestWaitingJobAgeMs:
          oldestWaitingTimestamp === null
            ? null
            : Math.max(0, Date.now() - oldestWaitingTimestamp),
      };
      return snapshot;
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
    await Promise.all([...this.queues.values()].map((queue) => queue.close()));
    this.queues.clear();
  }

  private getQueue(
    lane: NotificationQueueLane,
  ): Queue<NotificationDeliveryJobData> {
    const queue = this.queues.get(lane);
    if (!queue) {
      throw new Error('Notification BullMQ queue is not initialized');
    }
    return queue;
  }

  private baseHealthSnapshot(): NotificationQueueHealthSnapshot {
    return {
      enabled: this.isEnabled(),
      status: this.isEnabled() ? 'DEGRADED' : 'DISABLED',
      redis: this.isEnabled() ? 'UNAVAILABLE' : 'NOT_REQUIRED',
      worker: this.isEnabled() ? 'UNKNOWN' : 'NOT_REQUIRED',
      queueName: notificationQueueName('DEFAULT'),
      counts: {
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
        delayed: 0,
      },
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
    return this.configService.get<string>('notificationQueue.redisUrl')?.trim();
  }

  private redisUrlOrThrow(): string {
    const value = this.redisUrl();
    if (!value) {
      throw new Error(
        'NOTIFICATION_QUEUE_REDIS_URL or REDIS_URL is required when the notification queue is enabled',
      );
    }
    return value;
  }

  private prefix(): string {
    return (
      this.configService.get<string>('notificationQueue.prefix') ??
      'sawiyaa:notifications'
    );
  }

  private workerConcurrency(): number {
    const configured = this.configService.get<number>(
      'notificationQueue.workerConcurrency',
    );
    return Math.min(20, Math.max(1, configured ?? 2));
  }

  private laneWorkerConcurrency(lane: NotificationQueueLane): number {
    if (lane === 'EMAIL') {
      return this.readConfiguredConcurrency(
        'notificationQueue.emailWorkerConcurrency',
        1,
      );
    }
    if (lane === 'PUSH') {
      return this.readConfiguredConcurrency(
        'notificationQueue.pushWorkerConcurrency',
        1,
      );
    }
    return this.workerConcurrency();
  }

  private readConfiguredConcurrency(key: string, fallback: number): number {
    const configured = this.configService.get<number>(key);
    return typeof configured === 'number' && Number.isFinite(configured)
      ? Math.min(20, Math.max(1, Math.floor(configured)))
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
    const connection = {
      host: parsed.hostname,
      port: parsed.port ? Number.parseInt(parsed.port, 10) : 6379,
      ...(username ? { username } : {}),
      ...(password ? { password } : {}),
      ...(database ? { db: Number.parseInt(database, 10) } : {}),
      ...(parsed.protocol === 'rediss:' ? { tls: {} } : {}),
      connectTimeout: Math.max(
        100,
        this.configService.get<number>(
          'notificationQueue.connectionTimeoutMs',
        ) ?? 10_000,
      ),
      maxRetriesPerRequest,
      retryStrategy: (times: number) => Math.min(times * 250, 5_000),
    };
    return connection as ConnectionOptions;
  }

  private safeErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message.slice(0, 300) : 'QUEUE_ERROR';
  }

  private workerHeartbeatKey(): string {
    return `${this.prefix()}:worker-heartbeat`;
  }

  private async readWorkerHeartbeat(): Promise<'AVAILABLE' | 'UNKNOWN'> {
    const queue = this.queues.get('DEFAULT');
    if (!queue) return 'UNKNOWN';

    try {
      const client = await queue.client;
      const value = await (
        client as unknown as {
          get: (key: string) => Promise<string | null>;
        }
      ).get(this.workerHeartbeatKey());
      if (!value) return 'UNKNOWN';

      const timestamp = Number.parseInt(value, 10);
      if (Number.isFinite(timestamp)) {
        this.runtimeState.lastWorkerHeartbeatAt = new Date(timestamp);
      }
      return 'AVAILABLE';
    } catch {
      return 'UNKNOWN';
    }
  }
}
