import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
  Optional,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationDeliveryAttemptEngineService } from './notification-delivery-attempt-engine.service';
import { NotificationSchedulerCoreService } from './notification-scheduler-core.service';
import { NotificationDeliveryResilienceMetricsService } from './notification-delivery-resilience-metrics.service';
import { OperationalNotificationRepository } from '../repositories/operational-notification.repository';

@Injectable()
export class NotificationStaleQueuedReconcilerService
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private readonly logger = new Logger(
    NotificationStaleQueuedReconcilerService.name,
  );
  private intervalHandle: NodeJS.Timeout | null = null;
  private isRunning = false;
  private isShuttingDown = false;

  constructor(
    private readonly schedulerCoreService: NotificationSchedulerCoreService,
    private readonly deliveryAttemptEngineService: NotificationDeliveryAttemptEngineService,
    private readonly repository: OperationalNotificationRepository,
    @Optional() private readonly configService?: ConfigService,
    @Optional()
    private readonly metrics?: NotificationDeliveryResilienceMetricsService,
  ) {}

  onApplicationBootstrap(): void {
    if (!this.isEnabled()) {
      this.logger.log(
        'Notification stale QUEUED reconciler is disabled; lease recovery remains available through normal claims',
      );
      return;
    }

    this.isShuttingDown = false;
    void this.runOnce();
    this.intervalHandle = setInterval(() => {
      void this.runOnce();
    }, this.intervalMs());
    this.intervalHandle.unref?.();
  }

  onModuleDestroy(): void {
    this.isShuttingDown = true;
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }
  }

  async runOnce(now = new Date()): Promise<{
    scannedCount: number;
    recoveredCount: number;
    sentCount: number;
    failedCount: number;
    skippedCount: number;
  }> {
    if (!this.isEnabled() || this.isRunning || this.isShuttingDown) {
      return {
        scannedCount: 0,
        recoveredCount: 0,
        sentCount: 0,
        failedCount: 0,
        skippedCount: 0,
      };
    }

    this.isRunning = true;
    const startedAt = Date.now();
    let scannedCount = 0;
    let recoveredCount = 0;
    let sentCount = 0;
    let failedCount = 0;
    let skippedCount = 0;

    try {
      const oldestQueued = await this.repository.findOldestQueuedCreatedAt();
      this.metrics?.recordOldestQueuedSeconds(
        oldestQueued
          ? (now.getTime() - oldestQueued.createdAt.getTime()) / 1_000
          : null,
      );

      while (
        !this.isShuttingDown &&
        recoveredCount < this.maxRowsPerSweep() &&
        Date.now() - startedAt < this.maxDurationMs()
      ) {
        const remaining = this.maxRowsPerSweep() - recoveredCount;
        const result =
          await this.schedulerCoreService.claimStaleQueuedNotifications({
            now,
            limit: Math.min(this.batchSize(), remaining),
          });

        scannedCount += result.scannedCount;
        if (result.scannedCount > 0) {
          this.metrics?.recordLeaseExpired(result.scannedCount);
          this.metrics?.recordStaleQueued(result.scannedCount);
        }
        if (result.claimedCount === 0) {
          break;
        }

        recoveredCount += result.claimedCount;
        this.metrics?.recordRecovered(result.claimedCount);
        const execution =
          await this.deliveryAttemptEngineService.executeClaimedNotifications({
            claims: result.claims,
            now,
          });
        sentCount += execution.sentCount;
        failedCount += execution.failedCount;
        skippedCount += execution.skippedCount;
      }

      if (recoveredCount > 0) {
        this.logger.warn(
          `Recovered ${recoveredCount} stale queued notifications (scanned=${scannedCount}, sent=${sentCount}, failed=${failedCount}, skipped=${skippedCount})`,
        );
      }
      return {
        scannedCount,
        recoveredCount,
        sentCount,
        failedCount,
        skippedCount,
      };
    } catch (error) {
      this.metrics?.recordRecoveryFailed();
      this.logger.error(
        `Notification stale QUEUED reconciliation failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      return {
        scannedCount,
        recoveredCount,
        sentCount,
        failedCount,
        skippedCount,
      };
    } finally {
      this.isRunning = false;
    }
  }

  private isEnabled(): boolean {
    return (
      this.configService?.get<boolean>(
        'notificationQueue.staleQueuedReconcilerEnabled',
      ) ?? true
    );
  }

  private intervalMs(): number {
    return this.readConfig(
      'notificationQueue.staleQueuedReconciliationIntervalMs',
      60_000,
      1_000,
      600_000,
    );
  }

  private batchSize(): number {
    return this.readConfig(
      'notificationQueue.staleQueuedReconciliationBatchSize',
      25,
      1,
      500,
    );
  }

  private maxRowsPerSweep(): number {
    return this.readConfig(
      'notificationQueue.staleQueuedReconciliationMaxRowsPerSweep',
      100,
      1,
      5_000,
    );
  }

  private maxDurationMs(): number {
    return this.readConfig(
      'notificationQueue.staleQueuedReconciliationMaxDurationMs',
      5_000,
      250,
      60_000,
    );
  }

  private readConfig(
    key: string,
    fallback: number,
    minimum: number,
    maximum: number,
  ): number {
    const configured = this.configService?.get<number>(key);
    const value =
      typeof configured === 'number' && Number.isFinite(configured)
        ? configured
        : fallback;
    return Math.min(maximum, Math.max(minimum, Math.floor(value)));
  }
}
