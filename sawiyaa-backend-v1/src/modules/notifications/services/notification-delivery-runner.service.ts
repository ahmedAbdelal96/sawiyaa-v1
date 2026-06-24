import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';
import { NotificationDeliveryAttemptEngineService } from './notification-delivery-attempt-engine.service';
import { NotificationSchedulerCoreService } from './notification-scheduler-core.service';

const DELIVERY_RUN_INTERVAL_MS = 60_000;
const DELIVERY_RUN_BATCH_SIZE = 25;

@Injectable()
export class NotificationDeliveryRunnerService
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private readonly logger = new Logger(NotificationDeliveryRunnerService.name);
  private intervalHandle: NodeJS.Timeout | null = null;
  private isRunning = false;

  constructor(
    private readonly schedulerCoreService: NotificationSchedulerCoreService,
    private readonly deliveryAttemptEngineService: NotificationDeliveryAttemptEngineService,
  ) {}

  onApplicationBootstrap(): void {
    void this.runOnce();

    this.intervalHandle = setInterval(() => {
      void this.runOnce();
    }, DELIVERY_RUN_INTERVAL_MS);

    this.intervalHandle.unref?.();
  }

  onModuleDestroy(): void {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }
  }

  async runOnce(now = new Date()): Promise<{
    claimedCount: number;
    sentCount: number;
    failedCount: number;
    skippedCount: number;
  }> {
    if (this.isRunning) {
      return {
        claimedCount: 0,
        sentCount: 0,
        failedCount: 0,
        skippedCount: 0,
      };
    }

    this.isRunning = true;

    try {
      const claimResult = await this.schedulerCoreService.claimDueNotifications(
        {
          now,
          limit: DELIVERY_RUN_BATCH_SIZE,
        },
      );

      if (claimResult.claimedNotificationIds.length === 0) {
        return {
          claimedCount: claimResult.claimedCount,
          sentCount: 0,
          failedCount: 0,
          skippedCount: 0,
        };
      }

      const executionResult =
        await this.deliveryAttemptEngineService.executeClaimedNotifications({
          notificationIds: claimResult.claimedNotificationIds,
          now,
        });

      if (executionResult.total > 0) {
        this.logger.log(
          `Notification delivery run processed ${executionResult.total} claimed notifications`,
        );
      }

      return {
        claimedCount: claimResult.claimedCount,
        sentCount: executionResult.sentCount,
        failedCount: executionResult.failedCount,
        skippedCount: executionResult.skippedCount,
      };
    } finally {
      this.isRunning = false;
    }
  }
}
