import { SessionProvider, SessionStatus } from '@prisma/client';
import { OperationsQueueService } from '@common/queue/operations-queue.service';
import { SessionRepository } from '@modules/sessions/repositories/session.repository';
import { ReconcileSessionAttendanceUseCase } from '@modules/sessions/use-cases/reconcile-session-attendance.use-case';
import {
  DAILY_ATTENDANCE_RECONCILIATION_JOB_NAME,
  type DailyAttendanceReconciliationJobData,
} from '@common/queue/operations-queue.constants';
import { DailyAttendanceQueueWorkerService } from './daily-attendance-worker.service';

describe('DailyAttendanceQueueWorkerService', () => {
  const findAttendanceReconciliationState = jest.fn();
  const execute = jest.fn();
  const queue = {
    isDailyAttendanceEnabled: jest.fn(() => true),
    createDailyAttendanceWorker: jest.fn(),
    getWorkerHeartbeatIntervalMs: jest.fn(() => 10000),
    recordWorkerHeartbeat: jest.fn(),
    recordWorkerError: jest.fn(),
  } as unknown as OperationsQueueService;

  beforeEach(() => {
    jest.clearAllMocks();
    findAttendanceReconciliationState.mockResolvedValue({
      id: 'session-1',
      status: SessionStatus.AWAITING_COMPLETION_CONFIRMATION,
      provider: SessionProvider.DAILY,
      scheduledStartAt: new Date('2026-08-04T10:00:00.000Z'),
      scheduledEndAt: new Date('2026-08-04T11:00:00.000Z'),
      attendanceReconciliations: [],
    });
    execute.mockResolvedValue({ id: 'reconciliation-1' });
  });

  function job(data: DailyAttendanceReconciliationJobData) {
    return {
      name: DAILY_ATTENDANCE_RECONCILIATION_JOB_NAME,
      id: 'daily-attendance-session-1-1',
      data,
    } as never;
  }

  it('reloads eligibility and invokes the existing use case with the queued observation version', async () => {
    const service = new DailyAttendanceQueueWorkerService(
      queue,
      { findAttendanceReconciliationState } as unknown as SessionRepository,
      { execute } as unknown as ReconcileSessionAttendanceUseCase,
    );

    await expect(
      service.processJob(job({ sessionId: 'session-1', observationVersion: 1 })),
    ).resolves.toEqual({
      sessionId: 'session-1',
      observationVersion: 1,
      outcome: 'RECONCILED',
    });
    expect(execute).toHaveBeenCalledWith({
      sessionId: 'session-1',
      observationVersion: 1,
    });
  });

  it('does not call Daily for a stale or ineligible job', async () => {
    findAttendanceReconciliationState.mockResolvedValueOnce({
      id: 'session-1',
      status: SessionStatus.COMPLETED,
      provider: SessionProvider.DAILY,
      scheduledStartAt: new Date(),
      scheduledEndAt: new Date(),
      attendanceReconciliations: [],
    });
    const service = new DailyAttendanceQueueWorkerService(
      queue,
      { findAttendanceReconciliationState } as unknown as SessionRepository,
      { execute } as unknown as ReconcileSessionAttendanceUseCase,
    );

    await expect(
      service.processJob(job({ sessionId: 'session-1', observationVersion: 1 })),
    ).resolves.toEqual({
      sessionId: 'session-1',
      observationVersion: 1,
      outcome: 'SKIPPED_STALE',
    });
    expect(execute).not.toHaveBeenCalled();
  });

  it('does not replay provider work when a later observation already exists', async () => {
    findAttendanceReconciliationState.mockResolvedValueOnce({
      id: 'session-1',
      status: SessionStatus.AWAITING_COMPLETION_CONFIRMATION,
      provider: SessionProvider.DAILY,
      scheduledStartAt: new Date(),
      scheduledEndAt: new Date(),
      attendanceReconciliations: [{ observationVersion: 2 }],
    });
    const service = new DailyAttendanceQueueWorkerService(
      queue,
      { findAttendanceReconciliationState } as unknown as SessionRepository,
      { execute } as unknown as ReconcileSessionAttendanceUseCase,
    );

    await expect(
      service.processJob(job({ sessionId: 'session-1', observationVersion: 1 })),
    ).resolves.toEqual({
      sessionId: 'session-1',
      observationVersion: 1,
      outcome: 'SKIPPED_STALE',
    });
    expect(execute).not.toHaveBeenCalled();
  });
});
