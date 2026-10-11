import { SessionStatus } from '@prisma/client';
import { SessionCompletionConfirmationSweeperService } from './session-completion-confirmation-sweeper.service';

describe('SessionCompletionConfirmationSweeperService', () => {
  const listSessionsDueForCompletionConfirmation = jest.fn();
  const automaticCompletion = { execute: jest.fn() };
  const logger = { error: jest.fn(), log: jest.fn(), warn: jest.fn() };
  const service = new SessionCompletionConfirmationSweeperService(
    {
      listSessionsDueForCompletionConfirmation,
    } as never,
    automaticCompletion as never,
    logger as never,
  );

  beforeEach(() => {
    jest.resetAllMocks();
    listSessionsDueForCompletionConfirmation.mockResolvedValue([]);
    automaticCompletion.execute.mockResolvedValue({
      outcome: 'WAITING_FOR_EVIDENCE',
      reason: 'INSUFFICIENT_EVIDENCE',
    });
  });

  it('starts regardless of the removed completion enable flag', () => {
    service.onApplicationBootstrap();
    expect(listSessionsDueForCompletionConfirmation).toHaveBeenCalled();
    service.onModuleDestroy();
  });

  it('sends an elapsed active row directly to automatic completion without a review transition', async () => {
    listSessionsDueForCompletionConfirmation
      .mockResolvedValueOnce([
        {
          id: 'session-1',
          status: SessionStatus.IN_PROGRESS,
          scheduledEndAt: new Date('2026-07-15T11:00:00.000Z'),
        },
      ])
      .mockResolvedValueOnce([]);

    await expect(
      service.sweepOnce(new Date('2026-07-15T11:00:01.000Z')),
    ).resolves.toEqual(
      expect.objectContaining({
        scanned: 1,
        transitioned: 0,
        completed: 0,
        awaitingReview: 0,
        skipped: 1,
        failed: 0,
      }),
    );
    expect(automaticCompletion.execute).toHaveBeenCalledWith({
      sessionId: 'session-1',
      at: new Date('2026-07-15T11:00:01.000Z'),
      trigger: 'RECOVERY_SWEEPER',
    });
  });

  it('counts direct completion from a happy-path recovery attempt', async () => {
    listSessionsDueForCompletionConfirmation
      .mockResolvedValueOnce([
        {
          id: 'session-1',
          status: SessionStatus.IN_PROGRESS,
          scheduledEndAt: new Date('2026-07-15T11:00:00.000Z'),
        },
      ])
      .mockResolvedValueOnce([]);
    automaticCompletion.execute.mockResolvedValueOnce({
      outcome: 'COMPLETED',
      sessionId: 'session-1',
    });

    await expect(service.sweepOnce()).resolves.toEqual(
      expect.objectContaining({
        scanned: 1,
        transitioned: 0,
        completed: 1,
        awaitingReview: 0,
        failed: 0,
      }),
    );
  });

  it('retries an existing awaiting row for stranded-session recovery', async () => {
    listSessionsDueForCompletionConfirmation
      .mockResolvedValueOnce([
        {
          id: 'session-awaiting',
          status: SessionStatus.AWAITING_COMPLETION_CONFIRMATION,
          scheduledEndAt: new Date('2026-07-15T11:00:00.000Z'),
        },
      ])
      .mockResolvedValueOnce([]);
    automaticCompletion.execute.mockResolvedValueOnce({
      outcome: 'COMPLETED',
      sessionId: 'session-awaiting',
    });

    await expect(service.sweepOnce()).resolves.toEqual(
      expect.objectContaining({
        scanned: 1,
        transitioned: 0,
        completed: 1,
        failed: 0,
      }),
    );
    expect(automaticCompletion.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: 'session-awaiting',
        trigger: 'RECOVERY_SWEEPER',
      }),
    );
  });

  it('continues after one candidate fails and reports structured totals', async () => {
    process.env.SESSION_COMPLETION_CONFIRMATION_SWEEPER_BATCH_SIZE = '2';
    listSessionsDueForCompletionConfirmation
      .mockResolvedValueOnce([
        {
          id: 'session-1',
          status: SessionStatus.IN_PROGRESS,
          scheduledEndAt: new Date('2026-07-15T11:00:00.000Z'),
        },
        {
          id: 'session-2',
          status: SessionStatus.IN_PROGRESS,
          scheduledEndAt: new Date('2026-07-15T11:01:00.000Z'),
        },
      ])
      .mockResolvedValueOnce([]);
    automaticCompletion.execute
      .mockRejectedValueOnce(new Error('transient'))
      .mockResolvedValueOnce({ outcome: 'COMPLETED' });

    await expect(service.sweepOnce()).resolves.toEqual(
      expect.objectContaining({
        scanned: 2,
        transitioned: 0,
        completed: 1,
        failed: 1,
        batches: 1,
      }),
    );
    delete process.env.SESSION_COMPLETION_CONFIRMATION_SWEEPER_BATCH_SIZE;
  });

  it('processes more than one batch without offset pagination', async () => {
    process.env.SESSION_COMPLETION_CONFIRMATION_SWEEPER_BATCH_SIZE = '1';
    listSessionsDueForCompletionConfirmation
      .mockResolvedValueOnce([
        {
          id: 'session-1',
          status: SessionStatus.IN_PROGRESS,
          scheduledEndAt: new Date('2026-07-15T11:00:00.000Z'),
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'session-2',
          status: SessionStatus.IN_PROGRESS,
          scheduledEndAt: new Date('2026-07-15T11:01:00.000Z'),
        },
      ])
      .mockResolvedValueOnce([]);

    await expect(service.sweepOnce()).resolves.toEqual(
      expect.objectContaining({
        scanned: 2,
        transitioned: 0,
        batches: 2,
      }),
    );
    delete process.env.SESSION_COMPLETION_CONFIRMATION_SWEEPER_BATCH_SIZE;
  });
});
