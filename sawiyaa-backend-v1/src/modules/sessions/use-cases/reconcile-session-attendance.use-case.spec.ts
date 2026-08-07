import {
  SessionProvider,
  SessionReconciliationConfidence,
  SessionReconciliationStatus,
  SessionStatus,
} from '@prisma/client';
import { ReconcileSessionAttendanceUseCase } from './reconcile-session-attendance.use-case';
import { NormalizeSessionAttendanceReconciliationService } from '../services/normalize-session-attendance-reconciliation.service';

describe('ReconcileSessionAttendanceUseCase', () => {
  it('persists sanitized evidence idempotently without touching lifecycle state', async () => {
    const upsertAttendanceReconciliation = jest
      .fn()
      .mockResolvedValue({ id: 'recon-1' });
    const sessionRepository = {
      findById: jest.fn().mockResolvedValue({
        id: 'session-1',
        status: SessionStatus.AWAITING_COMPLETION_CONFIRMATION,
        providerRoomId: 'room-1',
        scheduledStartAt: new Date('2026-08-03T10:00:00.000Z'),
        scheduledEndAt: new Date('2026-08-03T10:30:00.000Z'),
        patientId: 'patient-1',
        practitionerId: 'practitioner-1',
      }),
      findLatestAttendanceReconciliation: jest.fn().mockResolvedValue(null),
      upsertAttendanceReconciliation,
    };
    const provider = {
      reconcileSession: jest.fn().mockResolvedValue({
        status: SessionReconciliationStatus.CONFIRMED,
        provider: SessionProvider.DAILY,
        roomFound: true,
        meetingStarted: false,
        meetingEnded: true,
        patient: {
          identityConfirmed: false,
          joined: false,
          totalPresenceSeconds: 0,
          firstJoinedAt: null,
          lastLeftAt: null,
        },
        practitioner: {
          identityConfirmed: false,
          joined: false,
          totalPresenceSeconds: 0,
          firstJoinedAt: null,
          lastLeftAt: null,
        },
        unknownParticipantCount: 0,
        providerMeetingId: 'meeting-1',
        reconciledAt: new Date('2026-08-03T11:00:00.000Z'),
        providerDataObservedUntil: new Date('2026-08-03T10:30:00.000Z'),
        confidence: SessionReconciliationConfidence.HIGH,
        reasonCodes: [],
        attemptNumber: 1,
        requestStatus: 'SUCCEEDED',
        failureCategory: null,
        eligibleForAutomaticFinalization: true,
      }),
    };
    const prisma = {
      $transaction: jest.fn((fn: (tx: unknown) => unknown) => fn({})),
    };
    const result = await new ReconcileSessionAttendanceUseCase(
      prisma as never,
      sessionRepository as never,
      new NormalizeSessionAttendanceReconciliationService(),
      provider,
    ).execute({ sessionId: 'session-1' });

    expect(result).toEqual({ id: 'recon-1' });
    expect(upsertAttendanceReconciliation).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: 'session-1',
        observationVersion: 1,
        eligibleForAutomaticFinalization: true,
      }),
      expect.anything(),
    );
    expect(sessionRepository).not.toHaveProperty('updateStatus');
  });
});
