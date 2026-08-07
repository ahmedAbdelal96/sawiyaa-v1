import { Prisma, SessionStatus } from '@prisma/client';
import { MarkSessionInProgressFromAttendanceService } from './mark-session-in-progress-from-attendance.service';

describe('MarkSessionInProgressFromAttendanceService', () => {
  const findByIdForUpdate = jest.fn();
  const transition = jest.fn();
  const service = new MarkSessionInProgressFromAttendanceService(
    { findByIdForUpdate } as never,
    { transition } as never,
  );
  const tx = {} as Prisma.TransactionClient;

  const evidence = {
    sessionId: 'session-1',
    participantUserId: 'patient-1',
    participantRole: 'PATIENT' as const,
    eventType: 'JOINED' as const,
    providerEventId: 'evt-1',
    ingestionKey: 'key-1',
    providerOccurredAt: new Date('2026-08-03T10:01:00.000Z'),
    receivedAt: new Date('2026-08-03T10:01:05.000Z'),
    trustLevel: 'TRUSTED' as const,
    lifecycleEligible: true,
  };

  beforeEach(() => {
    jest.resetAllMocks();
    transition.mockImplementation(async ({ session, to }: any) => ({
      ...session,
      status: to,
    }));
  });

  it('transitions READY_TO_JOIN to IN_PROGRESS through the lifecycle service', async () => {
    findByIdForUpdate.mockResolvedValue({
      id: 'session-1',
      status: SessionStatus.READY_TO_JOIN,
    });

    await expect(service.execute({ evidence, tx })).resolves.toBe(
      'transitioned',
    );
    expect(findByIdForUpdate).toHaveBeenCalledWith('session-1', tx);
    expect(transition).toHaveBeenCalledTimes(1);
    expect(transition).toHaveBeenCalledWith(
      expect.objectContaining({
        to: SessionStatus.IN_PROGRESS,
        tx,
        reason: 'trusted_participant_joined',
      }),
    );
  });

  it('recovers scheduler lag with UPCOMING to READY_TO_JOIN to IN_PROGRESS', async () => {
    findByIdForUpdate.mockResolvedValue({
      id: 'session-1',
      status: SessionStatus.UPCOMING,
    });

    await expect(service.execute({ evidence, tx })).resolves.toBe(
      'transitioned',
    );
    expect(transition.mock.calls.map(([input]) => input.to)).toEqual([
      SessionStatus.READY_TO_JOIN,
      SessionStatus.IN_PROGRESS,
    ]);
  });

  it('makes an already in-progress session an idempotent no-op', async () => {
    findByIdForUpdate.mockResolvedValue({
      id: 'session-1',
      status: SessionStatus.IN_PROGRESS,
    });

    await expect(service.execute({ evidence, tx })).resolves.toBe('idempotent');
    expect(transition).not.toHaveBeenCalled();
  });

  it('does not touch the lifecycle for untrusted evidence or terminal sessions', async () => {
    await expect(
      service.execute({
        evidence: { ...evidence, lifecycleEligible: false },
        tx,
      }),
    ).resolves.toBe('skipped');
    expect(findByIdForUpdate).not.toHaveBeenCalled();

    findByIdForUpdate.mockResolvedValue({
      id: 'session-1',
      status: SessionStatus.CANCELLED,
    });
    await expect(service.execute({ evidence, tx })).resolves.toBe('skipped');
    expect(transition).not.toHaveBeenCalled();
  });
});
