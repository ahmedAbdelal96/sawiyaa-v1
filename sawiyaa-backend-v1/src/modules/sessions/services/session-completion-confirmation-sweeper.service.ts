import {
  Injectable,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';
import { AppLoggerService } from '@common/logging/app-logger.service';
import { SessionStatus } from '@prisma/client';
import { SessionRepository } from '../repositories/session.repository';
import { SessionLifecycleService } from './session-lifecycle.service';
import {
  SecurityAuditActorType,
  SecurityAuditSource,
} from '@common/security-audit/security-audit.types';

const SWEEP_INTERVAL_MS = 60_000;
const DEFAULT_BATCH_SIZE = 50;
const DEFAULT_MAX_ROWS = 5_000;
const DEFAULT_GRACE_MINUTES = 15;

export type SessionCompletionSweepResult = {
  scanned: number;
  transitioned: number;
  skipped: number;
  failed: number;
  batches: number;
};

/** Persists time-ended sessions as awaiting confirmation; it never completes them. */
@Injectable()
export class SessionCompletionConfirmationSweeperService
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private intervalHandle: NodeJS.Timeout | null = null;
  private isSweeping = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly sessionRepository: SessionRepository,
    private readonly lifecycle: SessionLifecycleService,
    private readonly logger: AppLoggerService,
  ) {}

  onApplicationBootstrap(): void {
    if (process.env.SESSION_COMPLETION_CONFIRMATION_SWEEPER_ENABLED !== 'true') {
      return;
    }
    void this.sweepOnce();
    this.intervalHandle = setInterval(() => void this.sweepOnce(), SWEEP_INTERVAL_MS);
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
      skipped: 0,
      failed: 0,
      batches: 0,
    };
    if (this.isSweeping) return empty;
    this.isSweeping = true;
    try {
      const batchSize = this.readPositiveInt('SESSION_COMPLETION_CONFIRMATION_SWEEPER_BATCH_SIZE', DEFAULT_BATCH_SIZE);
      const maxRows = this.readPositiveInt('SESSION_COMPLETION_CONFIRMATION_SWEEPER_MAX_ROWS', DEFAULT_MAX_ROWS);
      const graceMinutes = this.readPositiveInt('SESSION_COMPLETION_CONFIRMATION_SWEEPER_GRACE_MINUTES', DEFAULT_GRACE_MINUTES);
      const result: SessionCompletionSweepResult = { ...empty };
      const failedIds = new Set<string>();
      let cursor: { scheduledEndAt: Date; id: string } | undefined;
      const cutoff = new Date(now.getTime() - graceMinutes * 60_000);
      while (true) {
        if (result.scanned >= maxRows) break;
        const sessions = await this.sessionRepository.listSessionsDueForCompletionConfirmation({
          now: cutoff,
          take: Math.min(batchSize, maxRows - result.scanned),
          excludeIds: [...failedIds],
          cursor,
        });
        if (sessions.length === 0) break;
        result.batches += 1;
        for (const session of sessions) {
          result.scanned += 1;
          try {
            const transitionResult = await this.prisma.$transaction(async (tx) => {
              // Claim and transition the same row in one transaction. SKIP
              // LOCKED lets another worker continue without waiting on us.
              const claimed = await this.sessionRepository
                .tryLockDueSessionForCompletionConfirmation(
                  { sessionId: session.id, now: cutoff },
                  tx,
                );
              if (!claimed) {
                return { outcome: 'skipped' as const, session: null };
              }
              return this.lifecycle.transitionIfCurrentStatus({
                sessionId: claimed.id,
                expectedStatuses: [
                  SessionStatus.UPCOMING,
                  SessionStatus.READY_TO_JOIN,
                ],
                to: SessionStatus.AWAITING_COMPLETION_CONFIRMATION,
                actorType: SecurityAuditActorType.SCHEDULED_JOB,
                source: SecurityAuditSource.SCHEDULED_JOB,
                at: now,
                metadata: { source: 'scheduledEndSweep' },
                tx,
              });
            });
            if (transitionResult.outcome === 'transitioned') {
              result.transitioned += 1;
            } else {
              result.skipped += 1;
            }
          } catch (error) {
            result.failed += 1;
            failedIds.add(session.id);
            this.logger.error(
              {
                message: 'Failed to move elapsed session to awaiting confirmation',
                sessionId: session.id,
                error: error instanceof Error ? error : new Error(String(error)),
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
          message: 'Session completion confirmation sweep finished',
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
