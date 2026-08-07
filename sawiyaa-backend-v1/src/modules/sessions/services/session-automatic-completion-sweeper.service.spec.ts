import { SessionAutomaticCompletionSweeperService } from './session-automatic-completion-sweeper.service';

describe('SessionAutomaticCompletionSweeperService', () => {
  afterEach(() => {
    delete process.env.SESSION_AUTOMATIC_COMPLETION_ENABLED;
    delete process.env.SESSION_AUTOMATIC_COMPLETION_BATCH_SIZE;
  });

  it('is disabled unless explicitly enabled', async () => {
    const sessions = { findDueAutomaticCompletionSessions: jest.fn() };
    const finalizer = { execute: jest.fn() };
    const worker = new SessionAutomaticCompletionSweeperService(
      sessions as never,
      finalizer as never,
    );
    await expect(worker.sweepOnce()).resolves.toEqual({
      enabled: false,
      scanned: 0,
      completed: 0,
      skipped: 0,
    });
    expect(sessions.findDueAutomaticCompletionSessions).not.toHaveBeenCalled();
  });

  it('isolates one failed finalization from the remaining batch', async () => {
    process.env.SESSION_AUTOMATIC_COMPLETION_ENABLED = 'true';
    process.env.SESSION_AUTOMATIC_COMPLETION_BATCH_SIZE = '2';
    const sessions = {
      findDueAutomaticCompletionSessions: jest
        .fn()
        .mockResolvedValue([{ id: 's1' }, { id: 's2' }]),
    };
    const finalizer = {
      execute: jest
        .fn()
        .mockRejectedValueOnce(new Error('transient'))
        .mockResolvedValueOnce('COMPLETED'),
    };
    const worker = new SessionAutomaticCompletionSweeperService(
      sessions as never,
      finalizer as never,
    );
    const result = await worker.sweepOnce(new Date('2026-08-03T16:00:00Z'));
    expect(result).toEqual(
      expect.objectContaining({
        enabled: true,
        scanned: 2,
        completed: 1,
        skipped: 1,
      }),
    );
    expect(finalizer.execute).toHaveBeenCalledTimes(2);
  });
});
