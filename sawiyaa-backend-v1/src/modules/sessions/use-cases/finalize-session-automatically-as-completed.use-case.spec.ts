import { SessionStatus } from '@prisma/client';
import { FinalizeSessionAutomaticallyAsCompletedUseCase } from './finalize-session-automatically-as-completed.use-case';

describe('FinalizeSessionAutomaticallyAsCompletedUseCase', () => {
  function build(
    evaluation: Record<string, unknown>,
    sessionStatus = SessionStatus.AWAITING_COMPLETION_CONFIRMATION,
  ) {
    const tx = {} as never;
    const sessions = {
      findByIdForUpdate: jest
        .fn()
        .mockResolvedValue({ id: 's1', status: sessionStatus }),
    };
    const attendance = {
      execute: jest.fn().mockResolvedValue({
        outcomeEvaluation: evaluation,
        policySnapshot: { version: 1 },
        reconciliation: {
          id: 'reconciliation-1',
          version: 2,
          evaluationStale: false,
          patient: { totalPresenceSeconds: 1260 },
          practitioner: { totalPresenceSeconds: 1260 },
          providerDataObservedUntil: '2026-08-03T15:00:00.000Z',
        },
        extendedSummary: { overlap: { overlapSeconds: 1260 } },
      }),
    };
    const completion = {
      execute: jest
        .fn()
        .mockResolvedValue({ id: 's1', status: SessionStatus.COMPLETED }),
    };
    const prisma = {
      $transaction: jest.fn((fn: (value: never) => unknown) => fn(tx)),
    };
    return {
      useCase: new FinalizeSessionAutomaticallyAsCompletedUseCase(
        prisma as never,
        sessions as never,
        attendance as never,
        completion as never,
      ),
      sessions,
      attendance,
      completion,
    };
  }

  const eligible = {
    classification: 'AUTO_COMPLETABLE',
    eligibleForAutomaticFinalization: true,
    recommendedTerminalStatus: 'COMPLETED',
    reasonCodes: ['COMPLETION_OVERLAP_THRESHOLD_MET'],
    evidenceSummary: { overlapPercentage: 70 },
  };

  it('completes only AUTO_COMPLETABLE under the locked transaction', async () => {
    const setup = build(eligible);
    await expect(
      setup.useCase.execute({
        sessionId: 's1',
        evaluatedAt: new Date('2026-08-03T16:00:00Z'),
      }),
    ).resolves.toBe('COMPLETED');
    expect(setup.sessions.findByIdForUpdate).toHaveBeenCalledWith(
      's1',
      expect.anything(),
    );
    expect(setup.completion.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        session: {
          id: 's1',
          status: SessionStatus.AWAITING_COMPLETION_CONFIRMATION,
        },
      }),
    );
  });

  it.each([
    'AUTO_PATIENT_NO_SHOW',
    'AUTO_PRACTITIONER_NO_SHOW',
    'AUTO_BOTH_NO_SHOW',
    'NEEDS_ADMIN_REVIEW',
    'NOT_READY_FOR_EVALUATION',
  ])('does not finalize %s', async (classification) => {
    const setup = build({ ...eligible, classification });
    await expect(setup.useCase.execute({ sessionId: 's1' })).resolves.toBe(
      'SKIPPED_NOT_ELIGIBLE',
    );
    expect(setup.completion.execute).not.toHaveBeenCalled();
  });

  it('does not finalize stale evidence', async () => {
    const setup = build(eligible);
    setup.attendance.execute.mockResolvedValueOnce({
      outcomeEvaluation: eligible,
      policySnapshot: { version: 1 },
      reconciliation: { version: 2, evaluationStale: true },
    });
    await expect(setup.useCase.execute({ sessionId: 's1' })).resolves.toBe(
      'SKIPPED_STALE',
    );
    expect(setup.completion.execute).not.toHaveBeenCalled();
  });

  it('treats an already completed session as an idempotent no-op', async () => {
    const setup = build(eligible, SessionStatus.COMPLETED);
    await expect(setup.useCase.execute({ sessionId: 's1' })).resolves.toBe(
      'ALREADY_COMPLETED',
    );
    expect(setup.attendance.execute).not.toHaveBeenCalled();
  });
});
