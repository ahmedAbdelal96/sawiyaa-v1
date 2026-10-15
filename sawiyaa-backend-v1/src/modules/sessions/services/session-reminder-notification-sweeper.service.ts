import {
  Injectable,
  OnApplicationBootstrap,
  OnModuleDestroy,
  Optional,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppLoggerService } from '@common/logging/app-logger.service';
import { OperationalNotificationService } from '@modules/notifications/services/operational-notification.service';
import {
  ClaimedSessionReminderQueueItem,
  SessionReminderQueueItem,
  SessionReminderQueueRepository,
} from '@modules/notifications/repositories/session-reminder-queue.repository';
import { isSessionReminderStale } from '@modules/notifications/services/session-reminder-freshness-policy';
import { SessionReminderQueueService } from '@common/queue/session-reminder-queue.service';

const SWEEP_INTERVAL_MS = 60_000;

type DispatchConfig = {
  batchSize: number;
  maxRowsPerSweep: number;
  maxDurationMs: number;
  concurrency: number;
  leaseDurationMs: number;
};

@Injectable()
export class SessionReminderNotificationSweeperService
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private intervalHandle: NodeJS.Timeout | null = null;
  private isSweeping = false;
  private isShuttingDown = false;

  constructor(
    private readonly sessionReminderQueueRepository: SessionReminderQueueRepository,
    private readonly operationalNotificationService: OperationalNotificationService,
    private readonly logger: AppLoggerService,
    @Optional() private readonly configService?: ConfigService,
    @Optional()
    private readonly sessionReminderRedisQueue?: SessionReminderQueueService,
  ) {}

  onApplicationBootstrap(): void {
    this.isShuttingDown = false;
    void this.sweepOnce();

    this.intervalHandle = setInterval(() => {
      void this.sweepOnce();
    }, SWEEP_INTERVAL_MS);

    this.intervalHandle.unref?.();
  }

  onModuleDestroy(): void {
    this.isShuttingDown = true;
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }
  }

  async sweepOnce(now = new Date()): Promise<number> {
    if (
      this.sessionReminderRedisQueue?.isPrimary() &&
      (await this.sessionReminderRedisQueue.isExecutionHealthy())
    ) {
      return 0;
    }
    if (this.isSweeping || this.isShuttingDown) {
      return 0;
    }

    this.isSweeping = true;
    const startedAt = Date.now();
    const config = this.dispatchConfig();
    let handledReminders = 0;
    let claimedRows = 0;

    try {
      while (
        !this.isShuttingDown &&
        claimedRows < config.maxRowsPerSweep &&
        Date.now() - startedAt < config.maxDurationMs
      ) {
        const remainingRows = config.maxRowsPerSweep - claimedRows;
        const claimResult =
          await this.sessionReminderQueueRepository.claimDueReminders({
            now,
            limit: Math.min(config.batchSize, remainingRows),
            leaseDurationMs: config.leaseDurationMs,
          });

        if (claimResult.reminders.length === 0) {
          break;
        }

        claimedRows += claimResult.reminders.length;
        handledReminders += await this.processBatch({
          reminders: claimResult.reminders,
          claimToken: claimResult.claimToken,
          now,
          concurrency: config.concurrency,
        });
      }

      return handledReminders;
    } finally {
      this.isSweeping = false;
    }
  }

  private async processBatch(input: {
    reminders: ClaimedSessionReminderQueueItem[];
    claimToken: string;
    now: Date;
    concurrency: number;
  }): Promise<number> {
    let nextIndex = 0;
    let handledReminders = 0;
    const workerCount = Math.min(input.concurrency, input.reminders.length);

    const processNext = async (): Promise<void> => {
      while (true) {
        const index = nextIndex++;
        const candidate = input.reminders[index];
        if (!candidate) return;

        const handled = await this.processClaimedReminder({
          candidate,
          claimToken: input.claimToken,
          now: input.now,
        });
        handledReminders += handled;
      }
    };

    await Promise.all(Array.from({ length: workerCount }, () => processNext()));
    return handledReminders;
  }

  private async processClaimedReminder(input: {
    candidate: ClaimedSessionReminderQueueItem;
    claimToken: string;
    now: Date;
  }): Promise<number> {
    const canonical =
      await this.sessionReminderQueueRepository.findClaimedReminder({
        reminderId: input.candidate.id,
        claimToken: input.claimToken,
        now: input.now,
      });

    if (!canonical) {
      return 0;
    }

    if (
      isSessionReminderStale({
        reminderType: canonical.reminderType,
        dueAt: canonical.dueAt,
        now: input.now,
      })
    ) {
      await this.sessionReminderQueueRepository.cancelReminder({
        reminderId: canonical.id,
        cancelledAt: input.now,
        claimToken: input.claimToken,
      });
      this.logger.warn(
        {
          message: 'Dropped stale session reminder',
          reminderId: canonical.id,
          sessionId: canonical.sessionId,
          reminderType: canonical.reminderType,
          dueAt: canonical.dueAt,
        },
        'Sessions',
      );
      return 0;
    }

    try {
      const result =
        await this.operationalNotificationService.dispatchScheduledSessionReminder(
          { reminder: canonical },
        );

      if (result.delivered) {
        const sent = await this.sessionReminderQueueRepository.markSent({
          reminderId: canonical.id,
          sentAt: input.now,
          claimToken: input.claimToken,
        });
        return sent.count > 0 ? 1 : 0;
      }

      await this.cancelReminderCandidate(
        canonical,
        input.now,
        result.skipReason,
        input.claimToken,
      );
      return 0;
    } catch (error) {
      // Keep the lease until it expires. This prevents a transient failure
      // from being retried repeatedly in the same bounded drain cycle while
      // still allowing another dispatcher to recover the row.
      this.logger.error(
        {
          message: 'Failed to process session reminder queue item',
          reminderId: canonical.id,
          sessionId: canonical.sessionId,
          error: error instanceof Error ? error : new Error(String(error)),
        },
        undefined,
        'Sessions',
      );
      return 0;
    }
  }

  private async cancelReminderCandidate(
    candidate: SessionReminderQueueItem,
    cancelledAt: Date,
    reason: string | undefined,
    claimToken: string,
  ): Promise<void> {
    const shouldCancelAllForSession =
      reason === 'SESSION_SCHEDULED_START_MISSING' ||
      reason?.startsWith('SESSION_STATUS_') === true;

    if (shouldCancelAllForSession) {
      await this.sessionReminderQueueRepository.cancelFutureBySessionId({
        sessionId: candidate.sessionId,
        cancelledAt,
      });
      return;
    }

    // A stale schedule revision must never cancel the new plan that replaced
    // it. Finalize only the claimed old row in that case.
    await this.sessionReminderQueueRepository.cancelReminder({
      reminderId: candidate.id,
      cancelledAt,
      claimToken,
    });
  }

  private dispatchConfig(): DispatchConfig {
    const maxDurationMs = this.readConfig('maxDurationMs', 5_000, 250, 60_000);
    const configuredLeaseDurationMs = this.readConfig(
      'leaseDurationMs',
      60_000,
      5_000,
      600_000,
    );

    return {
      batchSize: this.readConfig('batchSize', 100, 1, 500),
      maxRowsPerSweep: this.readConfig('maxRowsPerSweep', 500, 1, 5_000),
      maxDurationMs,
      concurrency: this.readConfig('concurrency', 4, 1, 20),
      // A lease must outlive the bounded drain window. Otherwise a slow but
      // healthy dispatcher could lose ownership while it is still processing.
      leaseDurationMs: Math.max(
        configuredLeaseDurationMs,
        maxDurationMs + 1_000,
      ),
    };
  }

  private readConfig(
    key: keyof DispatchConfig,
    fallback: number,
    minimum: number,
    maximum: number,
  ): number {
    const configured = this.configService?.get<number>(
      `sessionReminderDispatch.${key}`,
    );
    const value =
      typeof configured === 'number' && Number.isFinite(configured)
        ? configured
        : fallback;
    return Math.min(maximum, Math.max(minimum, Math.floor(value)));
  }
}
