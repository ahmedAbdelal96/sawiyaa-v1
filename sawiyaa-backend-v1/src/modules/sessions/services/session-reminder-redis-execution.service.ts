import { Injectable } from '@nestjs/common';
import { AppLoggerService } from '@common/logging/app-logger.service';
import { SessionReminderQueueService } from '@common/queue/session-reminder-queue.service';
import {
  ClaimedSessionReminderQueueItem,
  SessionReminderQueueRepository,
} from '@modules/notifications/repositories/session-reminder-queue.repository';
import { OperationalNotificationService } from '@modules/notifications/services/operational-notification.service';
import { isSessionReminderStale } from '@modules/notifications/services/session-reminder-freshness-policy';

@Injectable()
export class SessionReminderRedisExecutionService {
  constructor(
    private readonly repository: SessionReminderQueueRepository,
    private readonly operationalNotificationService: OperationalNotificationService,
    private readonly queue: SessionReminderQueueService,
    private readonly logger: AppLoggerService,
  ) {}

  async execute(input: {
    reminderId: string;
    scheduleRevision: number;
    now?: Date;
  }): Promise<{
    outcome: 'SENT' | 'NOOP' | 'STALE' | 'SKIPPED';
    reason?: string;
  }> {
    const now = input.now ?? new Date();
    const claimed = await this.repository.claimReminderById({
      reminderId: input.reminderId,
      scheduleRevision: input.scheduleRevision,
      now,
      leaseDurationMs: this.leaseDurationMs(),
    });
    if (!claimed) {
      this.queue.recordExecution('NOOP');
      return { outcome: 'NOOP', reason: 'CLAIM_NOT_WON_OR_STALE_JOB' };
    }

    if (
      isSessionReminderStale({
        reminderType: claimed.reminderType,
        dueAt: claimed.dueAt,
        now,
      })
    ) {
      await this.repository.cancelReminder({
        reminderId: claimed.id,
        cancelledAt: now,
        claimToken: claimed.claimToken,
      });
      this.queue.recordExecution('STALE');
      return { outcome: 'STALE', reason: 'FRESHNESS_WINDOW_EXPIRED' };
    }

    try {
      const result =
        await this.operationalNotificationService.dispatchScheduledSessionReminder(
          {
            reminder: claimed,
          },
        );
      if (result.delivered) {
        const sent = await this.repository.markSent({
          reminderId: claimed.id,
          sentAt: now,
          claimToken: claimed.claimToken,
        });
        if (sent.count > 0) {
          this.queue.recordExecution('SUCCESS');
          return { outcome: 'SENT' };
        }
        this.queue.recordExecution('NOOP');
        return { outcome: 'NOOP', reason: 'LEASE_LOST_BEFORE_FINALIZATION' };
      }

      await this.cancelCandidate(claimed, now, result.skipReason);
      this.queue.recordExecution('NOOP');
      return { outcome: 'SKIPPED', reason: result.skipReason };
    } catch (error) {
      this.logger.error(
        {
          message: 'Failed to execute Redis session reminder job',
          reminderId: claimed.id,
          sessionId: claimed.sessionId,
          error: error instanceof Error ? error : new Error(String(error)),
        },
        undefined,
        'Sessions',
      );
      throw error;
    }
  }

  private async cancelCandidate(
    candidate: ClaimedSessionReminderQueueItem,
    cancelledAt: Date,
    reason: string | undefined,
  ): Promise<void> {
    const cancelAll =
      reason === 'SESSION_SCHEDULED_START_MISSING' ||
      reason?.startsWith('SESSION_STATUS_') === true;
    if (cancelAll) {
      await this.repository.cancelFutureBySessionId({
        sessionId: candidate.sessionId,
        cancelledAt,
      });
      return;
    }
    await this.repository.cancelReminder({
      reminderId: candidate.id,
      cancelledAt,
      claimToken: candidate.claimToken,
    });
  }

  private leaseDurationMs(): number {
    const configured = Number.parseInt(
      process.env.REMINDER_LEASE_DURATION_MS ?? '60000',
      10,
    );
    return Number.isFinite(configured) ? Math.max(5_000, configured) : 60_000;
  }
}
