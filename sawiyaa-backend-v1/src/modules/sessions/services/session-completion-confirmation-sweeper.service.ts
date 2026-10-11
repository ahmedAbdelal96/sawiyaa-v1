import {
  Injectable,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';
import { AppLoggerService } from '@common/logging/app-logger.service';
import { SessionRepository } from '../repositories/session.repository';
import { AutomaticSessionCompletionService } from './automatic-session-completion.service';

const SWEEP_INTERVAL_MS = 60_000;
const DEFAULT_BATCH_SIZE = 50;
const DEFAULT_MAX_ROWS = 5_000;

export type SessionCompletionSweepResult = {
  scanned: number;
  /** Kept for result compatibility; the automatic attempt owns transitions. */
  transitioned: number;
  completed: number;
  awaitingReview: number;
  skipped: number;
  failed: number;
  batches: number;
};

/**
 * Mandatory API-process recovery path for elapsed sessions. It invokes the
 * automatic attempt directly; that attempt evaluates first and persists the
 * exception state only when review is actually required.
 */
@Injectable()
export class SessionCompletionConfirmationSweeperService
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private intervalHandle: NodeJS.Timeout | null = null;
  private isSweeping = false;

  constructor(
    private readonly sessionRepository: SessionRepository,
    private readonly automaticCompletion: AutomaticSessionCompletionService,
    private readonly logger: AppLoggerService,
  ) {}

  onApplicationBootstrap(): void {
    void this.sweepOnce();
    this.intervalHandle = setInterval(
      () => void this.sweepOnce(),
      SWEEP_INTERVAL_MS,
    );
    this.intervalHandle.unref?.();
  }

  onModuleDestroy(): void {
    if (this.intervalHandle) clearInterval(this.intervalHandle);
    this.intervalHandle = null;
  }

  async sweepOnce(now = new Date()): Promise<SessionCompletionSweepResult> {
    const empty: SessionCompletionSweepResult = {
      scanned: 0,
      transitioned: 0,
      completed: 0,
      awaitingReview: 0,
      skipped: 0,
      failed: 0,
      batches: 0,
    };
    if (this.isSweeping) return empty;
    this.isSweeping = true;
    try {
      const batchSize = this.readPositiveInt(
        'SESSION_COMPLETION_CONFIRMATION_SWEEPER_BATCH_SIZE',
        DEFAULT_BATCH_SIZE,
      );
      const maxRows = this.readPositiveInt(
        'SESSION_COMPLETION_CONFIRMATION_SWEEPER_MAX_ROWS',
        DEFAULT_MAX_ROWS,
      );
      const result: SessionCompletionSweepResult = { ...empty };
      const failedIds = new Set<string>();
      let cursor: { scheduledEndAt: Date; id: string } | undefined;

      while (true) {
        if (result.scanned >= maxRows) break;
        const sessions =
          await this.sessionRepository.listSessionsDueForCompletionConfirmation(
            {
              now,
              take: Math.min(batchSize, maxRows - result.scanned),
              excludeIds: [...failedIds],
              cursor,
            },
          );
        if (sessions.length === 0) break;
        result.batches += 1;

        for (const session of sessions) {
          result.scanned += 1;
          try {
            const completionResult = await this.automaticCompletion.execute({
              sessionId: session.id,
              at: now,
              trigger: 'RECOVERY_SWEEPER',
            });
            if (completionResult.outcome === 'COMPLETED') {
              result.completed += 1;
            } else if (completionResult.outcome === 'AWAITING_REVIEW') {
              result.awaitingReview += 1;
            } else {
              result.skipped += 1;
            }
          } catch (error) {
            result.failed += 1;
            failedIds.add(session.id);
            this.logger.error(
              {
                message:
                  'Failed to process elapsed session completion lifecycle',
                sessionId: session.id,
                error:
                  error instanceof Error ? error : new Error(String(error)),
              },
              undefined,
              'Sessions',
            );
          }
          if (session.scheduledEndAt) {
            cursor = { scheduledEndAt: session.scheduledEndAt, id: session.id };
          }
        }
        if (sessions.length < batchSize) break;
      }

      this.logger.log(
        {
          message: 'Session completion recovery sweep finished',
          ...result,
        },
        'Sessions',
      );
      return result;
    } finally {
      this.isSweeping = false;
    }
  }

  private readPositiveInt(name: string, fallback: number): number {
    const value = Number.parseInt(process.env[name] ?? '', 10);
    return Number.isInteger(value) && value > 0 ? value : fallback;
  }
}
