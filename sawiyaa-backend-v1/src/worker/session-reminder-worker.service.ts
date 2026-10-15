import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { Job } from 'bullmq';
import { SessionReminderQueueService } from '@common/queue/session-reminder-queue.service';
import {
  SESSION_REMINDER_EXECUTION_JOB_NAME,
  type SessionReminderExecutionJobData,
} from '@common/queue/session-reminder-queue.constants';
import { SessionReminderRedisExecutionService } from '@modules/sessions/services/session-reminder-redis-execution.service';

@Injectable()
export class SessionReminderWorkerService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(SessionReminderWorkerService.name);
  private worker: ReturnType<
    SessionReminderQueueService['createWorker']
  > | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;

  constructor(
    private readonly queue: SessionReminderQueueService,
    private readonly execution: SessionReminderRedisExecutionService,
  ) {}

  onModuleInit(): void {
    void this.start();
  }

  private async start(): Promise<void> {
    if (!this.queue.isPrimary() || !(await this.queue.isQueueAvailable())) {
      this.logger.log(
        'Session reminder Redis worker is disabled or Redis is not ready; DB dispatcher remains active',
      );
      return;
    }

    this.worker = this.queue.createWorker((job) => this.processJob(job));
    this.worker.on('ready', () => {
      this.queue.recordWorkerHeartbeat();
      this.logger.log('Session reminder Redis worker is ready');
    });
    this.worker.on('active', (job) => {
      this.queue.recordWorkerHeartbeat();
      this.logger.debug(`Session reminder job active: ${job.id}`);
    });
    this.worker.on('completed', (job) => {
      this.queue.recordWorkerHeartbeat();
      this.logger.debug(`Session reminder job completed: ${job.id}`);
    });
    this.worker.on('failed', (job, error) => {
      this.queue.recordWorkerError(error);
      this.logger.error(
        `Session reminder job failed: ${job?.id ?? 'unknown'} (${error.message})`,
      );
    });
    this.worker.on('stalled', (jobId) => {
      this.queue.recordWorkerHeartbeat();
      this.logger.warn(`Session reminder job stalled: ${jobId}`);
    });
    this.worker.on('error', (error) => {
      this.queue.recordWorkerError(error);
      this.logger.error(`Session reminder worker error: ${error.message}`);
    });

    this.heartbeatTimer = setInterval(
      () => this.queue.recordWorkerHeartbeat(),
      this.readHeartbeatIntervalMs(),
    );
    this.heartbeatTimer.unref?.();
  }

  async onModuleDestroy(): Promise<void> {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    if (this.worker) {
      await this.worker.close();
      this.worker = null;
    }
  }

  async processJob(job: Job<SessionReminderExecutionJobData>) {
    if (job.name !== SESSION_REMINDER_EXECUTION_JOB_NAME) {
      throw new Error(`Unsupported session reminder job name: ${job.name}`);
    }
    if (!job.data?.reminderId || !Number.isInteger(job.data.scheduleRevision)) {
      throw new Error('Session reminder job has invalid identifiers');
    }
    return this.execution.execute(job.data);
  }

  private readHeartbeatIntervalMs(): number {
    const configured = Number.parseInt(
      process.env.REMINDER_REDIS_WORKER_HEARTBEAT_INTERVAL_MS ?? '10000',
      10,
    );
    return Number.isFinite(configured)
      ? Math.min(60_000, Math.max(1_000, configured))
      : 10_000;
  }
}
