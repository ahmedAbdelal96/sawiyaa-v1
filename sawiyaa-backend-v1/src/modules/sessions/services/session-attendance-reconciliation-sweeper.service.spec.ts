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
      enqueued: 0,
      enqueueFailed: 0,
    });
    expect(execute).toHaveBeenCalledWith({ sessionId: 'session-1' });
    expect(logger.error).toHaveBeenCalled();
  });

  it('publishes only when the queue is enabled and does not call the provider path', async () => {
    const listSessionsAwaitingReconciliation = jest
      .fn()
      .mockResolvedValue([
        { id: 'session-1', attendanceReconciliations: [] },
        { id: 'session-2', attendanceReconciliations: [{ observationVersion: 3 }] },
      ]);
    const execute = jest.fn();
    const enqueueDailyAttendance = jest.fn()
      .mockResolvedValueOnce({ enqueued: true })
      .mockResolvedValueOnce({ enqueued: false, reason: 'ENQUEUE_FAILED' });
    const service = new SessionAttendanceReconciliationSweeperService(
      { listSessionsAwaitingReconciliation } as never,
      { execute } as never,
      { error: jest.fn(), warn: jest.fn() } as never,
      {
        isDailyAttendanceEnabled: jest.fn(() => true),
        enqueueDailyAttendance,
      } as never,
    );

    await expect(service.sweepOnce()).resolves.toEqual(
      expect.objectContaining({
        scanned: 2,
        enqueued: 1,
        enqueueFailed: 1,
      }),
    );
    expect(enqueueDailyAttendance).toHaveBeenNthCalledWith(
      1,
      'session-1',
      1,
    );
    expect(enqueueDailyAttendance).toHaveBeenNthCalledWith(
      2,
      'session-2',
      4,
    );
    expect(execute).not.toHaveBeenCalled();
  });
});
