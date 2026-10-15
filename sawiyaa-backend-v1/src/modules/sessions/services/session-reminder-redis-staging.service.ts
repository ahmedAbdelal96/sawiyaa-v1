import {
  Injectable,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppLoggerService } from '@common/logging/app-logger.service';
import { SessionReminderQueueService } from '@common/queue/session-reminder-queue.service';
import { SessionReminderQueueRepository } from '@modules/notifications/repositories/session-reminder-queue.repository';

@Injectable()
export class SessionReminderRedisStagingService
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private intervalHandle: NodeJS.Timeout | null = null;
  private isRefilling = false;
  private isShuttingDown = false;

  constructor(
    private readonly repository: SessionReminderQueueRepository,
    private readonly queue: SessionReminderQueueService,
    private readonly logger: AppLoggerService,
    private readonly configService: ConfigService,
  ) {}

  onApplicationBootstrap(): void {
    this.isShuttingDown = false;
    if (!this.queue.isEnabled()) return;
    void this.refillOnce();
    this.intervalHandle = setInterval(
      () => void this.refillOnce(),
      this.readConfig('refillIntervalMs', 30_000, 1_000, 300_000),
    );
    this.intervalHandle.unref?.();
  }

  onModuleDestroy(): void {
    this.isShuttingDown = true;
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }
  }

  async refillOnce(now = new Date()): Promise<number> {
    if (this.isRefilling || this.isShuttingDown || !this.queue.isEnabled()) {
      return 0;
    }

    this.isRefilling = true;
    const startedAt = Date.now();
    let staged = 0;
    let scanned = 0;
    try {
      const maxRows = this.readConfig('stageMaxRows', 5_000, 1, 20_000);
      const batchSize = this.readConfig('stageBatchSize', 500, 1, 5_000);
      const candidates = await this.repository.listStageableReminders({
        now,
        horizonMinutes: this.readConfig('horizonMinutes', 60, 1, 240),
        lookbackMinutes: this.readConfig('lookbackMinutes', 15, 1, 30),
        limit: maxRows,
      });

      for (let offset = 0; offset < candidates.length; offset += batchSize) {
        if (this.isShuttingDown) break;
        const batch = candidates.slice(offset, offset + batchSize);
        for (const candidate of batch) {
          scanned += 1;
          const outcome = await this.queue.stage({
            data: {
              reminderId: candidate.id,
              scheduleRevision: candidate.scheduleRevision,
            },
            delayMs: Math.max(0, candidate.dueAt.getTime() - now.getTime()),
          });
          if (outcome === 'ENSURED') staged += 1;
          if (candidate.dueAt.getTime() < now.getTime()) {
            this.queue.recordRecovery();
          }
          if (outcome === 'FAILED' || outcome === 'UNAVAILABLE') {
            this.queue.markStageFailure();
          }
        }
      }

      this.queue.markStageSuccess();
      this.logger.info(
        {
          message: 'Session reminder Redis refill completed',
          candidates: candidates.length,
          staged,
          durationMs: Date.now() - startedAt,
        },
        undefined,
        'Sessions',
      );
      return scanned;
    } catch (error) {
      this.queue.markStageFailure();
      this.logger.error(
        {
          message: 'Session reminder Redis refill failed',
          error: error instanceof Error ? error : new Error(String(error)),
          durationMs: Date.now() - startedAt,
        },
        undefined,
        'Sessions',
      );
      return scanned;
    } finally {
      this.isRefilling = false;
    }
  }

  private readConfig(
    key: string,
    fallback: number,
    minimum: number,
    maximum: number,
  ): number {
    const configured = this.configService.get<number>(
      `sessionReminderRedis.${key}`,
    );
    const value =
      typeof configured === 'number' && Number.isFinite(configured)
        ? configured
        : fallback;
    return Math.min(maximum, Math.max(minimum, Math.floor(value)));
  }
}
