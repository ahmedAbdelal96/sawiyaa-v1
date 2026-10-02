import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Job } from 'bullmq';
import { NotificationDeliveryAttemptEngineService } from '@modules/notifications/services/notification-delivery-attempt-engine.service';
import { NotificationSchedulerCoreService } from '@modules/notifications/services/notification-scheduler-core.service';
import {
  NOTIFICATION_DELIVERY_JOB_NAME,
  type NotificationDeliveryJobData,
} from '@common/queue/notification-queue.constants';
import { NotificationQueueService } from '@common/queue/notification-queue.service';

@Injectable()
export class NotificationQueueWorkerService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(NotificationQueueWorkerService.name);
  private worker: ReturnType<NotificationQueueService['createWorker']> | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;

  constructor(
    private readonly queueService: NotificationQueueService,
    private readonly schedulerCoreService: NotificationSchedulerCoreService,
    private readonly deliveryAttemptEngineService: NotificationDeliveryAttemptEngineService,
  ) {}

  onModuleInit(): void {
    if (!this.queueService.isEnabled()) {
      this.logger.log('Notification worker is disabled; DB fallback runner remains active');
      return;
    }

    this.worker = this.queueService.createWorker((job) => this.processJob(job));
    this.worker.on('ready', () => {
      this.queueService.recordWorkerHeartbeat();
      this.logger.log('Notification worker is ready');
    });
    this.worker.on('active', (job) => {
      this.queueService.recordWorkerHeartbeat();
      this.logger.debug(`Notification job active: ${job.id}`);
    });
    this.worker.on('completed', (job) => {
      this.queueService.recordWorkerHeartbeat();
      this.logger.debug(`Notification job completed: ${job.id}`);
    });
    this.worker.on('failed', (job, error) => {
      this.queueService.recordWorkerHeartbeat();
      this.queueService.recordWorkerError(error);
      this.logger.error(
        `Notification job failed: ${job?.id ?? 'unknown'} (${error.message})`,
      );
    });
    this.worker.on('stalled', (jobId) => {
      this.queueService.recordWorkerHeartbeat();
      this.logger.warn(`Notification job stalled: ${jobId}`);
    });
    this.worker.on('error', (error) => {
      this.queueService.recordWorkerError(error);
      this.logger.error(`Notification worker error: ${error.message}`);
    });

    const intervalMs = this.queueService.getWorkerHeartbeatIntervalMs();
    this.heartbeatTimer = setInterval(() => {
      this.queueService.recordWorkerHeartbeat();
    }, intervalMs);
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

  async processJob(job: Job<NotificationDeliveryJobData>) {
    if (job.name !== NOTIFICATION_DELIVERY_JOB_NAME) {
      throw new Error(`Unsupported notification job name: ${job.name}`);
    }

    const notificationId = job.data?.notificationId;
    if (!notificationId) {
      throw new Error('Notification job is missing notificationId');
    }

    const now = new Date();
    const claimed = await this.schedulerCoreService.claimNotificationById({
      notificationId,
      now,
    });
    if (!claimed) {
      return {
        notificationId,
        outcome: 'SKIPPED' as const,
        executed: false,
        reason: 'CLAIM_NOT_WON',
      };
    }

    // The existing engine reloads the QUEUED row, re-checks domain validity,
    // creates the attempt row, executes the channel adapter, and persists the
    // terminal/retry state in PostgreSQL.
    return this.deliveryAttemptEngineService.executeClaimedNotification({
      notificationId,
      now,
    });
  }
}
