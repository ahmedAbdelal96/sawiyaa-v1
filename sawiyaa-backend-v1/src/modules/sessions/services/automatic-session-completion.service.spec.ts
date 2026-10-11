import { SessionProvider, SessionStatus } from '@prisma/client';
import { AutomaticSessionCompletionService } from './automatic-session-completion.service';

describe('AutomaticSessionCompletionService', () => {
  const transaction = jest.fn();
  const findByIdForUpdate = jest.fn();
  const findAttendanceReconciliationState = jest.fn();
  const transition = jest.fn();
  const attendance = { execute: jest.fn() };
  const reconcile = { execute: jest.fn() };
  const complete = { execute: jest.fn() };
  const logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() };

  const buildService = () =>
    new AutomaticSessionCompletionService(
      { $transaction: transaction } as never,
      { findByIdForUpdate, findAttendanceReconciliationState } as never,
      { transition } as never,
      attendance as never,
      reconcile as never,
      complete as never,
      logger as never,
    );

  const at = new Date('2026-07-15T11:15:00.000Z');
  const session = {
    id: 'session-1',
    status: SessionStatus.IN_PROGRESS,
    scheduledEndAt: new Date('2026-07-15T11:00:00.000Z'),
  };

  beforeEach(() => {
    jest.resetAllMocks();
    transaction.mockImplementation((fn: (tx: unknown) => unknown) => fn({}));
    findByIdForUpdate.mockResolvedValue(session);
    findAttendanceReconciliationState.mockResolvedValue(null);
    reconcile.execute.mockResolvedValue(null);
    transition.mockResolvedValue({
      ...session,
      status: SessionStatus.AWAITING_COMPLETION_CONFIRMATION,
    });
    complete.execute.mockResolvedValue({
      ...session,
      status: SessionStatus.COMPLETED,
    });
  });

  it('completes only a trusted normal completion candidate through the canonical transaction service', async () => {
    attendance.execute.mockResolvedValue({
      extendedSummary: {
        reviewDecision: {
          canApproveNormally: true,
          reasonCode: 'COMPLETION_CANDIDATE',
        },
      },
      reconciliation: null,
    });

    await expect(
      buildService().execute({
        sessionId: session.id,
        at,
        trigger: 'RECOVERY_SWEEPER',
      }),
    ).resolves.toEqual(
      expect.objectContaining({ outcome: 'COMPLETED', sessionId: session.id }),
    );

    expect(transition).not.toHaveBeenCalled();
    expect(complete.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        session: expect.objectContaining({
          status: SessionStatus.IN_PROGRESS,
        }),
        reason: 'AUTOMATIC_COMPLETION_TRUSTED_ATTENDANCE',
      }),
    );
  });

  it('completes directly from IN_PROGRESS at scheduled end without persisting awaiting or waiting 15 minutes', async () => {
    attendance.execute.mockResolvedValue({
      extendedSummary: {
        reviewDecision: {
          canApproveNormally: true,
          reasonCode: 'COMPLETION_CANDIDATE',
        },
      },
      reconciliation: null,
    });

    const scheduledEnd = new Date('2026-07-15T11:00:00.000Z');
    await expect(
      buildService().execute({
        sessionId: session.id,
        at: scheduledEnd,
        trigger: 'PROVIDER_MEETING_ENDED',
      }),
    ).resolves.toEqual(
      expect.objectContaining({ outcome: 'COMPLETED' }),
    );

    expect(transition).not.toHaveBeenCalled();
    expect(complete.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        session: expect.objectContaining({ status: SessionStatus.IN_PROGRESS }),
      }),
    );
  });

  it('refreshes Daily evidence before evaluating a provider-ended trigger', async () => {
    findAttendanceReconciliationState.mockResolvedValue({
      id: session.id,
      status: SessionStatus.IN_PROGRESS,
      provider: SessionProvider.DAILY,
      scheduledStartAt: new Date('2026-07-15T10:30:00.000Z'),
      scheduledEndAt: session.scheduledEndAt,
    });
    attendance.execute.mockResolvedValue({
      extendedSummary: {
        reviewDecision: {
          canApproveNormally: true,
          reasonCode: 'COMPLETION_CANDIDATE',
        },
      },
      reconciliation: null,
    });

    await buildService().execute({
      sessionId: session.id,
      at,
      trigger: 'PROVIDER_MEETING_ENDED',
    });
    expect(reconcile.execute).toHaveBeenCalledWith({ sessionId: session.id });
  });

  it('completes an existing awaiting row directly when trusted evidence becomes sufficient', async () => {
    findByIdForUpdate.mockResolvedValue({
      ...session,
      status: SessionStatus.AWAITING_COMPLETION_CONFIRMATION,
    });
    attendance.execute.mockResolvedValue({
      extendedSummary: {
        reviewDecision: {
          canApproveNormally: true,
          reasonCode: 'COMPLETION_CANDIDATE',
        },
      },
      reconciliation: null,
    });

    await expect(
      buildService().execute({
        sessionId: session.id,
        at,
        trigger: 'RECOVERY_SWEEPER',
      }),
    ).resolves.toEqual(expect.objectContaining({ outcome: 'COMPLETED' }));

    expect(transition).not.toHaveBeenCalled();
    expect(complete.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        session: expect.objectContaining({
          status: SessionStatus.AWAITING_COMPLETION_CONFIRMATION,
        }),
      }),
    );
  });

  it('keeps the session awaiting when trusted completion evidence is missing', async () => {
    attendance.execute.mockResolvedValue({
      extendedSummary: {
        reviewDecision: {
          canApproveNormally: false,
          reasonCode: 'INSUFFICIENT_EVIDENCE',
        },
      },
      reconciliation: null,
    });

    await expect(
      buildService().execute({
        sessionId: session.id,
        at,
        trigger: 'RECOVERY_SWEEPER',
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        outcome: 'AWAITING_REVIEW',
        reason: 'INSUFFICIENT_EVIDENCE',
      }),
    );
    expect(complete.execute).not.toHaveBeenCalled();
  });

  it('keeps an evidence-delay retry active before the historical recovery grace expires', async () => {
    attendance.execute.mockResolvedValue({
      extendedSummary: {
        reviewDecision: {
          canApproveNormally: false,
          reasonCode: 'INSUFFICIENT_EVIDENCE',
        },
      },
      reconciliation: null,
    });

    await expect(
      buildService().execute({
        sessionId: session.id,
        at: new Date('2026-07-15T11:01:00.000Z'),
        trigger: 'RECOVERY_SWEEPER',
      }),
    ).resolves.toEqual(
      expect.objectContaining({ outcome: 'WAITING_FOR_EVIDENCE' }),
    );
    expect(transition).not.toHaveBeenCalled();
    expect(complete.execute).not.toHaveBeenCalled();
  });

  it('completes on a later retry when delayed evidence becomes sufficient', async () => {
    attendance.execute
      .mockResolvedValueOnce({
        extendedSummary: {
          reviewDecision: {
            canApproveNormally: false,
            reasonCode: 'INSUFFICIENT_EVIDENCE',
          },
        },
        reconciliation: null,
      })
      .mockResolvedValueOnce({
        extendedSummary: {
          reviewDecision: {
            canApproveNormally: true,
            reasonCode: 'COMPLETION_CANDIDATE',
          },
        },
        reconciliation: null,
      });

    const service = buildService();
    await expect(
      service.execute({
        sessionId: session.id,
        at: new Date('2026-07-15T11:01:00.000Z'),
        trigger: 'RECOVERY_SWEEPER',
      }),
    ).resolves.toEqual(expect.objectContaining({ outcome: 'WAITING_FOR_EVIDENCE' }));
    await expect(
      service.execute({
        sessionId: session.id,
        at: new Date('2026-07-15T11:02:00.000Z'),
        trigger: 'RECOVERY_SWEEPER',
      }),
    ).resolves.toEqual(expect.objectContaining({ outcome: 'COMPLETED' }));
  });

  it('does not complete when only one participant or a no-show candidate is present', async () => {
    attendance.execute.mockResolvedValue({
      extendedSummary: {
        reviewDecision: {
          canApproveNormally: false,
          reasonCode: 'PATIENT_NO_SHOW_CANDIDATE',
        },
      },
      reconciliation: null,
    });

    await expect(
      buildService().execute({
        sessionId: session.id,
        at,
        trigger: 'PROVIDER_MEETING_ENDED',
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        outcome: 'AWAITING_REVIEW',
        reason: 'PATIENT_NO_SHOW_CANDIDATE',
      }),
    );
    expect(complete.execute).not.toHaveBeenCalled();
  });

  it('does not complete from a meeting-ended trigger when the outcome is still early or unresolved', async () => {
    attendance.execute.mockResolvedValue({
      extendedSummary: {
        reviewDecision: {
          canApproveNormally: false,
          reasonCode: 'EARLY_ROOM_CLOSURE',
        },
      },
      reconciliation: null,
    });

    await buildService().execute({
      sessionId: session.id,
      at,
      trigger: 'PROVIDER_MEETING_ENDED',
    });

    expect(complete.execute).not.toHaveBeenCalled();
  });

  it('protects terminal states and is idempotent for an already completed session', async () => {
    findByIdForUpdate.mockResolvedValueOnce({
      ...session,
      status: SessionStatus.COMPLETED,
    });
    await expect(
      buildService().execute({
        sessionId: session.id,
        at,
        trigger: 'RECOVERY_SWEEPER',
      }),
    ).resolves.toEqual(
      expect.objectContaining({ outcome: 'ALREADY_COMPLETED' }),
    );

    findByIdForUpdate.mockResolvedValueOnce({
      ...session,
      status: SessionStatus.CANCELLED,
    });
    await expect(
      buildService().execute({
        sessionId: session.id,
        at,
        trigger: 'RECOVERY_SWEEPER',
      }),
    ).resolves.toEqual(
      expect.objectContaining({ outcome: 'TERMINAL_STATE_PROTECTED' }),
    );
    expect(attendance.execute).not.toHaveBeenCalled();
    expect(complete.execute).not.toHaveBeenCalled();
  });
});
