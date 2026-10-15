import { Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationStatus } from '@prisma/client';
import { NotificationLifecycleService } from './notification-lifecycle.service';
import {
  NotificationExecutionClaim,
  OperationalNotificationRepository,
} from '../repositories/operational-notification.repository';
import { NotificationDeliveryResilienceMetricsService } from './notification-delivery-resilience-metrics.service';

@Injectable()
export class NotificationSchedulerCoreService {
  private readonly logger = new Logger(NotificationSchedulerCoreService.name);

  constructor(
    private readonly repository: OperationalNotificationRepository,
    private readonly notificationLifecycleService: NotificationLifecycleService,
    private readonly configService?: ConfigService,
    @Optional()
    private readonly metrics?: NotificationDeliveryResilienceMetricsService,
  ) {}

  async claimNotificationById(input: {
    notificationId: string;
    now?: Date;
  }): Promise<NotificationExecutionClaim | null> {
    const now = input.now ?? new Date();
    this.notificationLifecycleService.assertCanBeClaimedForExecution(
      NotificationStatus.PENDING,
    );

    return this.repository.claimNotificationForExecution({
      notificationId: input.notificationId,
      now,
      leaseDurationMs: this.claimLeaseDurationMs(),
    });
  }

  async claimDueNotifications(input: { now?: Date; limit?: number }): Promise<{
    scannedCount: number;
    claimedCount: number;
    claimedNotificationIds: string[];
    claims?: NotificationExecutionClaim[];
  }> {
    const now = input.now ?? new Date();
    const limit = Math.max(1, input.limit ?? 50);

    const dueRows = await this.repository.listDueNotificationIds({
      now,
      limit,
    });
    const claimedNotificationIds: string[] = [];
    const claims: NotificationExecutionClaim[] = [];

    for (const row of dueRows) {
      // Lifecycle guard kept centralized and explicit for later slices.
      this.notificationLifecycleService.assertCanBeClaimedForExecution(
        NotificationStatus.PENDING,
      );

      const claimed = await this.claimNotificationById({
        notificationId: row.id,
        now,
      });
      const normalizedClaim = this.normalizeClaim(row.id, claimed, now);
      if (normalizedClaim !== null) {
        claimedNotificationIds.push(normalizedClaim.notificationId);
        claims.push(normalizedClaim);
        this.metrics?.recordClaimed();
      } else {
        this.metrics?.recordClaimConflict();
      }
    }

    if (claimedNotificationIds.length > 0) {
      this.logger.log(
        `Claimed ${claimedNotificationIds.length} due notifications for execution`,
      );
    }

    const result: {
      scannedCount: number;
      claimedCount: number;
      claimedNotificationIds: string[];
      claims?: NotificationExecutionClaim[];
    } = {
      scannedCount: dueRows.length,
      claimedCount: claimedNotificationIds.length,
      claimedNotificationIds,
    };
    if (claims.some((claim) => claim.claimToken.length > 0)) {
      result.claims = claims;
    }
    return result;
  }

  async claimStaleQueuedNotifications(input: {
    now?: Date;
    limit?: number;
  }): Promise<{
    scannedCount: number;
    claimedCount: number;
    claims: NotificationExecutionClaim[];
  }> {
    const now = input.now ?? new Date();
    const limit = Math.max(1, input.limit ?? 25);
    const staleRows = await this.repository.listStaleQueuedNotificationIds({
      now,
      limit,
    });
    const claims: NotificationExecutionClaim[] = [];

    for (const row of staleRows) {
      const claimed = await this.claimNotificationById({
        notificationId: row.id,
        now,
      });
      const normalizedClaim = this.normalizeClaim(row.id, claimed, now);
      if (normalizedClaim !== null) {
        claims.push(normalizedClaim);
        this.metrics?.recordClaimed();
      } else {
        this.metrics?.recordClaimConflict();
      }
    }

    if (claims.length > 0) {
      this.logger.warn(
        `Reclaimed ${claims.length} stale queued notifications for execution`,
      );
    }

    return {
      scannedCount: staleRows.length,
      claimedCount: claims.length,
      claims,
    };
  }

  private claimLeaseDurationMs(): number {
    const configured = this.configService?.get<number>(
      'notificationQueue.claimLeaseDurationMs',
    );
    if (typeof configured !== 'number' || !Number.isFinite(configured)) {
      return 300_000;
    }
    return Math.min(3_600_000, Math.max(10_000, Math.floor(configured)));
  }

  private normalizeClaim(
    notificationId: string,
    claim: NotificationExecutionClaim | boolean | { count?: number } | null,
    now: Date,
  ): NotificationExecutionClaim | null {
    if (!claim) return null;
    if (typeof claim === 'object' && 'notificationId' in claim) {
      return claim;
    }
    const won = typeof claim === 'boolean' ? claim : claim.count === 1;
    return won
      ? {
          notificationId,
          claimToken: '',
          claimedAt: now,
          claimUntil: now,
        }
      : null;
  }
}
