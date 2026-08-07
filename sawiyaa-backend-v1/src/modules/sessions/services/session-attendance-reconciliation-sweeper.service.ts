import {
  Injectable,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';
import { AppLoggerService } from '@common/logging/app-logger.service';
import { SessionRepository } from '../repositories/session.repository';
import { ReconcileSessionAttendanceUseCase } from '../use-cases/reconcile-session-attendance.use-case';

const SWEEP_INTERVAL_MS = 60_000;
const DEFAULT_BATCH_SIZE = 25;

export type SessionReconciliationSweepResult = {
  scanned: number;
  reconciled: number;
  failed: number;
};

/** Optional Phase 2.5 worker. It persists evidence only; it never finalizes. */
@Injectable()
export class SessionAttendanceReconciliationSweeperService
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private intervalHandle: NodeJS.Timeout | null = null;
  private running = false;

  constructor(
    private readonly sessions: SessionRepository,
    private readonly reconcile: ReconcileSessionAttendanceUseCase,
    private readonly logger: AppLoggerService,
  ) {}

  onApplicationBootstrap(): void {
    if (
      process.env.SESSION_ATTENDANCE_RECONCILIATION_SWEEPER_ENABLED !== 'true'
    ) {
      this.logger.warn(
        {
          message: 'Session attendance reconciliation worker is disabled',
          readiness: 'RECONCILIATION_WORKER_DISABLED',
        },
        'Sessions',
      );
      return;
    }
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

  async sweepOnce(): Promise<SessionReconciliationSweepResult> {
    if (this.running) return { scanned: 0, reconciled: 0, failed: 0 };
    this.running = true;
    const result = { scanned: 0, reconciled: 0, failed: 0 };
    try {
      const take = this.readPositiveInt(
        'SESSION_ATTENDANCE_RECONCILIATION_SWEEPER_BATCH_SIZE',
        DEFAULT_BATCH_SIZE,
      );
      const candidates = await this.sessions.listSessionsAwaitingReconciliation(
        { take },
      );
      for (const candidate of candidates) {
        result.scanned += 1;
        try {
          await this.reconcile.execute({ sessionId: candidate.id });
          result.reconciled += 1;
        } catch (error) {
          result.failed += 1;
          this.logger.error(
            {
              message: 'Session attendance reconciliation failed',
              sessionId: candidate.id,
              error: error instanceof Error ? error : new Error(String(error)),
            },
            undefined,
            'Sessions',
          );
        }
      }
      return result;
    } finally {
      this.running = false;
    }
  }

  private readPositiveInt(name: string, fallback: number): number {
    const value = Number.parseInt(process.env[name] ?? '', 10);
    return Number.isInteger(value) && value > 0 ? value : fallback;
  }
}
