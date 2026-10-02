import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Job } from 'bullmq';
import { SessionProvider, SessionStatus } from '@prisma/client';
import { OperationsQueueService } from '@common/queue/operations-queue.service';
import {
  DAILY_ATTENDANCE_RECONCILIATION_JOB_NAME,
  type DailyAttendanceReconciliationJobData,
} from '@common/queue/operations-queue.constants';
import { SessionRepository } from '@modules/sessions/repositories/session.repository';
import { ReconcileSessionAttendanceUseCase } from '@modules/sessions/use-cases/reconcile-session-attendance.use-case';

@Injectable()
export class DailyAttendanceQueueWorkerService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(DailyAttendanceQueueWorkerService.name);
  private worker: ReturnType<OperationsQueueService['createDailyAttendanceWorker']> | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;

  constructor(
    private readonly queueService: OperationsQueueService,
    private readonly sessions: SessionRepository,
    private readonly reconcile: ReconcileSessionAttendanceUseCase,
  ) {}

  onModuleInit(): void {
    if (!this.queueService.isDailyAttendanceEnabled()) {
      this.logger.log(
        'Daily attendance worker is disabled; API sweeper rollback path remains active',
      );
      return;
    }

    try {
      this.worker = this.queueService.createDailyAttendanceWorker((job) =>
        this.processJob(job),
      );
    } catch (error) {
      this.queueService.recordWorkerError(error);
      this.logger.error(
        `Daily attendance worker could not start; queue remains degraded (${error instanceof Error ? error.message : String(error)})`,
      );
      return;
    }
    this.worker.on('ready', () => {
      this.queueService.recordWorkerHeartbeat();
      this.logger.log('Daily attendance worker is ready');
    });
    this.worker.on('active', (job) => {
      this.queueService.recordWorkerHeartbeat();
      this.logger.debug(`Daily attendance job active: ${job.id}`);
    });
    this.worker.on('completed', (job) => {
      this.queueService.recordWorkerHeartbeat();
      this.logger.debug(`Daily attendance job completed: ${job.id}`);
    });
    this.worker.on('failed', (job, error) => {
      this.queueService.recordWorkerHeartbeat();
      this.queueService.recordWorkerError(error);
      this.logger.error(
        `Daily attendance job failed: ${job?.id ?? 'unknown'} (${error.message})`,
      );
    });
    this.worker.on('stalled', (jobId) => {
      this.queueService.recordWorkerHeartbeat();
      this.logger.warn(`Daily attendance job stalled: ${jobId}`);
    });
    this.worker.on('error', (error) => {
      this.queueService.recordWorkerError(error);
      this.logger.error(`Daily attendance worker error: ${error.message}`);
    });

    this.heartbeatTimer = setInterval(() => {
      this.queueService.recordWorkerHeartbeat();
    }, this.queueService.getWorkerHeartbeatIntervalMs());
    this.heartbeatTimer.unref?.();
  }

  async onModuleDestroy(): Promise<void> {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    if (this.worker) {
      await this.worker.close();
      this.worker = null;
    }
  }

  async processJob(job: Job<DailyAttendanceReconciliationJobData>) {
    const startedAt = Date.now();
    if (job.name !== DAILY_ATTENDANCE_RECONCILIATION_JOB_NAME) {
      throw new Error(`Unsupported operations job name: ${job.name}`);
    }
    const sessionId = job.data?.sessionId;
    const observationVersion = job.data?.observationVersion;
    if (
      !sessionId ||
      !Number.isInteger(observationVersion) ||
      observationVersion < 1
    ) {
      throw new Error(
        'Daily attendance job requires sessionId and positive observationVersion',
      );
    }

    const state = await this.sessions.findAttendanceReconciliationState(sessionId);
    const latestVersion = state?.attendanceReconciliations?.[0]?.observationVersion ?? 0;
    const eligible =
      state?.status === SessionStatus.AWAITING_COMPLETION_CONFIRMATION &&
      state.provider === SessionProvider.DAILY &&
      state.scheduledStartAt !== null &&
      state.scheduledEndAt !== null;
    if (
      !eligible ||
      latestVersion >= observationVersion ||
      latestVersion + 1 !== observationVersion
    ) {
      this.logger.debug(
        `Daily attendance job skipped as stale sessionId=${sessionId} observationVersion=${observationVersion} durationMs=${Date.now() - startedAt}`,
      );
      return {
        sessionId,
        observationVersion,
        outcome: 'SKIPPED_STALE' as const,
      };
    }

    await this.reconcile.execute({ sessionId, observationVersion });
    this.logger.debug(
      `daily_attendance_processing_completed sessionId=${sessionId} observationVersion=${observationVersion} durationMs=${Date.now() - startedAt}`,
    );
    return {
      sessionId,
      observationVersion,
      outcome: 'RECONCILED' as const,
    };
  }
}
