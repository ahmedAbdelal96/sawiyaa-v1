import { Injectable, Logger } from '@nestjs/common';
import { NotificationStatus } from '@prisma/client';
import { NotificationLifecycleService } from './notification-lifecycle.service';
import { OperationalNotificationRepository } from '../repositories/operational-notification.repository';

@Injectable()
export class NotificationSchedulerCoreService {
  private readonly logger = new Logger(NotificationSchedulerCoreService.name);

  constructor(
    private readonly repository: OperationalNotificationRepository,
    private readonly notificationLifecycleService: NotificationLifecycleService,
  ) {}

  async claimDueNotifications(input: { now?: Date; limit?: number }): Promise<{
    scannedCount: number;
    claimedCount: number;
    claimedNotificationIds: string[];
  }> {
    const now = input.now ?? new Date();
    const limit = Math.max(1, input.limit ?? 50);

    const dueRows = await this.repository.listDueNotificationIds({
      now,
      limit,
    });
    const claimedNotificationIds: string[] = [];

    for (const row of dueRows) {
      // Lifecycle guard kept centralized and explicit for later slices.
      this.notificationLifecycleService.assertCanBeClaimedForExecution(
        NotificationStatus.PENDING,
      );

      const claimed = await this.repository.claimNotificationForExecution({
        notificationId: row.id,
        now,
      });
      if (claimed.count > 0) {
        claimedNotificationIds.push(row.id);
      }
    }

    if (claimedNotificationIds.length > 0) {
      this.logger.log(
        `Claimed ${claimedNotificationIds.length} due notifications for execution`,
      );
    }

    return {
      scannedCount: dueRows.length,
      claimedCount: claimedNotificationIds.length,
      claimedNotificationIds,
    };
  }
}
