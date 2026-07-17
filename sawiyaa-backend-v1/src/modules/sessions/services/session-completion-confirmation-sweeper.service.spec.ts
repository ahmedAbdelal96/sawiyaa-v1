import { SessionStatus } from '@prisma/client';
import { SessionCompletionConfirmationSweeperService } from './session-completion-confirmation-sweeper.service';

describe('SessionCompletionConfirmationSweeperService', () => {
  const listSessionsDueForCompletionConfirmation = jest.fn();
  const tryLockDueSessionForCompletionConfirmation = jest.fn();
  const transitionIfCurrentStatus = jest.fn();
  const transaction = jest.fn();
  const logger = { error: jest.fn(), log: jest.fn() };
  const service = new SessionCompletionConfirmationSweeperService(
    { $transaction: transaction } as never,
    {
      listSessionsDueForCompletionConfirmation,
      tryLockDueSessionForCompletionConfirmation,
    } as never,
    { transitionIfCurrentStatus } as never,
    logger as never,
  );

  beforeEach(() => {
    jest.resetAllMocks();
    transaction.mockImplementation(async (fn: (tx: unknown) => unknown) =>
      fn({}),
    );
    tryLockDueSessionForCompletionConfirmation.mockImplementation(
      ({ sessionId }: { sessionId: string }) =>
        Promise.resolve({ id: sessionId, status: SessionStatus.UPCOMING }),
    );
    transitionIfCurrentStatus.mockResolvedValue({ outcome: 'transitioned' });
  });

  it('moves elapsed upcoming rows to awaiting confirmation after grace', async () => {
    listSessionsDueForCompletionConfirmation
      .mockResolvedValueOnce([{ id: 'session-1', status: SessionStatus.UPCOMING }])
      .mockResolvedValueOnce([]);

    expect(await service.sweepOnce(new Date('2026-07-15T10:30:00.000Z'))).toEqual(
      expect.objectContaining({
        scanned: 1,
        transitioned: 1,
        skipped: 0,
        failed: 0,
        batches: 1,
      }),
    );
    expect(transitionIfCurrentStatus).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: 'session-1',
        expectedStatuses: [
          SessionStatus.UPCOMING,
          SessionStatus.READY_TO_JOIN,
        ],
        to: SessionStatus.AWAITING_COMPLETION_CONFIRMATION,
      }),
    );
  });

  it('does not create a duplicate transition for an already handled row', async () => {
    listSessionsDueForCompletionConfirmation
      .mockResolvedValueOnce([{ id: 'session-1', status: SessionStatus.UPCOMING }])
      .mockResolvedValueOnce([]);
    transitionIfCurrentStatus.mockResolvedValue({ outcome: 'idempotent' });

    expect(await service.sweepOnce()).toEqual(
      expect.objectContaining({
        scanned: 1,
        transitioned: 0,
        skipped: 1,
        failed: 0,
        batches: 1,
      }),
    );
  });

  it('continues after one candidate fails and reports structured totals', async () => {
    process.env.SESSION_COMPLETION_CONFIRMATION_SWEEPER_BATCH_SIZE = '2';
    listSessionsDueForCompletionConfirmation
      .mockResolvedValueOnce([
        { id: 'session-1', status: SessionStatus.UPCOMING },
        { id: 'session-2', status: SessionStatus.READY_TO_JOIN },
      ])
      .mockResolvedValueOnce([]);
    transitionIfCurrentStatus
      .mockRejectedValueOnce(new Error('transient'))
      .mockResolvedValueOnce({ outcome: 'transitioned' });

    await expect(service.sweepOnce()).resolves.toEqual(
      expect.objectContaining({
        scanned: 2,
        transitioned: 1,
        skipped: 0,
        failed: 1,
        batches: 1,
      }),
    );
    delete process.env.SESSION_COMPLETION_CONFIRMATION_SWEEPER_BATCH_SIZE;
  });

  it('processes more than one batch without offset pagination', async () => {
    process.env.SESSION_COMPLETION_CONFIRMATION_SWEEPER_BATCH_SIZE = '1';
    listSessionsDueForCompletionConfirmation
      .mockResolvedValueOnce([{ id: 'session-1', status: SessionStatus.UPCOMING }])
      .mockResolvedValueOnce([{ id: 'session-2', status: SessionStatus.READY_TO_JOIN }])
      .mockResolvedValueOnce([]);

    await expect(service.sweepOnce()).resolves.toEqual(
      expect.objectContaining({
        scanned: 2,
        transitioned: 2,
        batches: 2,
      }),
    );
    delete process.env.SESSION_COMPLETION_CONFIRMATION_SWEEPER_BATCH_SIZE;
  });

  it('does not transition an in-progress row when a stale candidate is returned', async () => {
    listSessionsDueForCompletionConfirmation
      .mockResolvedValueOnce([{ id: 'session-1', status: SessionStatus.IN_PROGRESS }])
      .mockResolvedValueOnce([]);
    tryLockDueSessionForCompletionConfirmation.mockResolvedValueOnce({
      id: 'session-1',
      status: SessionStatus.IN_PROGRESS,
    });
    transitionIfCurrentStatus.mockResolvedValueOnce({ outcome: 'skipped' });

    await expect(service.sweepOnce()).resolves.toEqual(
      expect.objectContaining({ transitioned: 0, skipped: 1, failed: 0 }),
    );
    expect(transitionIfCurrentStatus).toHaveBeenCalledWith(
      expect.objectContaining({
        expectedStatuses: [SessionStatus.UPCOMING, SessionStatus.READY_TO_JOIN],
      }),
    );
  });
});
