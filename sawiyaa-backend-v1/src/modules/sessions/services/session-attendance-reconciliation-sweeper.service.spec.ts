import { SessionAttendanceReconciliationSweeperService } from './session-attendance-reconciliation-sweeper.service';

describe('SessionAttendanceReconciliationSweeperService', () => {
  it('reconciles awaiting sessions and reports failures without lifecycle writes', async () => {
    const listSessionsAwaitingReconciliation = jest
      .fn()
      .mockResolvedValue([{ id: 'session-1' }, { id: 'session-2' }]);
    const execute = jest
      .fn()
      .mockResolvedValueOnce({ id: 'recon-1' })
      .mockRejectedValueOnce(new Error('provider-timeout'));
    const logger = { error: jest.fn(), warn: jest.fn() };
    const service = new SessionAttendanceReconciliationSweeperService(
      { listSessionsAwaitingReconciliation } as never,
      { execute } as never,
      logger as never,
    );

    await expect(service.sweepOnce()).resolves.toEqual({
      scanned: 2,
      reconciled: 1,
      failed: 1,
    });
    expect(execute).toHaveBeenCalledWith({ sessionId: 'session-1' });
    expect(logger.error).toHaveBeenCalled();
  });
});
