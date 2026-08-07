import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { FinalizeSessionAutomaticallyAsCompletedUseCase } from '../use-cases/finalize-session-automatically-as-completed.use-case';
import { SessionRepository } from '../repositories/session.repository';

@Injectable()
export class SessionAutomaticCompletionSweeperService {
  private readonly logger = new Logger(
    SessionAutomaticCompletionSweeperService.name,
  );

  async sweepOnce(now = new Date()) {
    if (process.env.SESSION_AUTOMATIC_COMPLETION_ENABLED !== 'true') {
      return { enabled: false, scanned: 0, completed: 0, skipped: 0 };
    }

    const batchSize = Math.max(
      1,
      Math.min(
        Number.parseInt(
          process.env.SESSION_AUTOMATIC_COMPLETION_BATCH_SIZE ?? '25',
          10,
        ) || 25,
        100,
      ),
    );
    const workerRunId = randomUUID();
    const candidates = await this.sessions.findDueAutomaticCompletionSessions({
      now,
      batchSize,
    });
    let completed = 0;
    let skipped = 0;

    for (const candidate of candidates) {
      try {
        const result = await this.finalizer.execute({
          sessionId: candidate.id,
          evaluatedAt: now,
          trigger: 'automatic-completion-worker',
          workerRunId,
        });
        if (result === 'COMPLETED') completed += 1;
        else skipped += 1;
      } catch (error) {
        skipped += 1;
        this.logger.error(
          JSON.stringify({
            message: 'Automatic completion finalization failed',
            sessionId: candidate.id,
            workerRunId,
            error: error instanceof Error ? error.message : 'UNKNOWN_ERROR',
          }),
        );
      }
    }

    return {
      enabled: true,
      scanned: candidates.length,
      completed,
      skipped,
      workerRunId,
    };
  }

  constructor(
    private readonly sessions: SessionRepository,
    private readonly finalizer: FinalizeSessionAutomaticallyAsCompletedUseCase,
  ) {}
}
