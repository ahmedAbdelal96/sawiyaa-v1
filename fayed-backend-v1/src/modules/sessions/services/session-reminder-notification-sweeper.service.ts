import {
  Injectable,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';
import { AppLoggerService } from '@common/logging/app-logger.service';
import { OperationalNotificationService } from '@modules/notifications/services/operational-notification.service';
import {
  SessionReminderQueueItem,
  SessionReminderQueueRepository,
} from '@modules/notifications/repositories/session-reminder-queue.repository';

const SWEEP_INTERVAL_MS = 60_000;
const SWEEP_BATCH_SIZE = 50;

@Injectable()
export class SessionReminderNotificationSweeperService
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private intervalHandle: NodeJS.Timeout | null = null;
  private isSweeping = false;

  constructor(
    private readonly sessionReminderQueueRepository: SessionReminderQueueRepository,
    private readonly operationalNotificationService: OperationalNotificationService,
    private readonly logger: AppLoggerService,
  ) {}

  onApplicationBootstrap(): void {
    void this.sweepOnce();

    this.intervalHandle = setInterval(() => {
      void this.sweepOnce();
    }, SWEEP_INTERVAL_MS);

    this.intervalHandle.unref?.();
  }

  onModuleDestroy(): void {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }
  }

  async sweepOnce(now = new Date()): Promise<number> {
    if (this.isSweeping) {
      return 0;
    }

    this.isSweeping = true;

    try {
      const candidates = await this.sessionReminderQueueRepository.listDueReminders(
        {
          now,
          limit: SWEEP_BATCH_SIZE,
        },
      );

      let handledReminders = 0;

      for (const candidate of candidates) {
        try {
          const result =
            await this.operationalNotificationService.dispatchScheduledSessionReminder(
              {
                reminder: candidate,
              },
            );

          if (result.delivered) {
            const sent = await this.sessionReminderQueueRepository.markSent(
              {
                reminderId: candidate.id,
                sentAt: now,
              },
            );
            if (sent.count > 0) {
              handledReminders += 1;
            }
            continue;
          }

          await this.cancelReminderCandidate(candidate, now, result.skipReason);
        } catch (error) {
          this.logger.error(
            {
              message: 'Failed to process session reminder queue item',
              reminderId: candidate.id,
              sessionId: candidate.sessionId,
              error: error instanceof Error ? error : new Error(String(error)),
            },
            undefined,
            'Sessions',
          );
        }
      }

      return handledReminders;
    } finally {
      this.isSweeping = false;
    }
  }

  private async cancelReminderCandidate(
    candidate: SessionReminderQueueItem,
    cancelledAt: Date,
    reason?: string,
  ): Promise<void> {
    const shouldCancelAllForSession =
      reason === 'SESSION_NOT_FOUND' ||
      reason === 'SESSION_SCHEDULED_START_MISSING' ||
      reason?.startsWith('SESSION_STATUS_') === true;

    if (shouldCancelAllForSession) {
      await this.sessionReminderQueueRepository.cancelFutureBySessionId({
        sessionId: candidate.sessionId,
        cancelledAt,
      });
      return;
    }

    if (
      reason === 'SESSION_RECIPIENT_PROFILE_MISSING' ||
      reason === 'SESSION_RECIPIENT_NOT_FOUND'
    ) {
      await this.sessionReminderQueueRepository.cancelReminder({
        reminderId: candidate.id,
        cancelledAt,
      });
    }
  }
}
