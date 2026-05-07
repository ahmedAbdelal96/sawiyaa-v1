import { ExpireUnpaidSessionSweeperService } from './expire-unpaid-session-sweeper.service';

describe('ExpireUnpaidSessionSweeperService', () => {
  function buildService() {
    const sessionRepository = {
      listPendingPaymentSessionsDueForExpiry: jest
        .fn()
        .mockResolvedValueOnce([
          {
            id: 'session_1',
            sessionCode: 'SES-2026-000001',
            expiresAt: new Date('2026-04-29T10:15:00.000Z'),
          },
          {
            id: 'session_2',
            sessionCode: 'SES-2026-000002',
            expiresAt: new Date('2026-04-29T10:20:00.000Z'),
          },
        ])
        .mockResolvedValueOnce([]),
    };

    const expireUnpaidSessionUseCase = {
      execute: jest.fn().mockResolvedValue({}),
    };

    const logger = {
      info: jest.fn(),
      error: jest.fn(),
    };

    const service = new ExpireUnpaidSessionSweeperService(
      sessionRepository as never,
      expireUnpaidSessionUseCase as never,
      logger as never,
    );

    return { service, sessionRepository, expireUnpaidSessionUseCase, logger };
  }

  it('expires all due unpaid sessions in batches', async () => {
    const setup = buildService();

    const expiredCount = await setup.service.sweepOnce(
      new Date('2026-04-29T10:30:00.000Z'),
    );

    expect(
      setup.sessionRepository.listPendingPaymentSessionsDueForExpiry,
    ).toHaveBeenCalledWith({
      now: new Date('2026-04-29T10:30:00.000Z'),
      take: 50,
    });
    expect(setup.expireUnpaidSessionUseCase.execute).toHaveBeenCalledTimes(2);
    expect(expiredCount).toBe(2);
    expect(setup.logger.info).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Expired unpaid sessions sweep completed',
        expiredCount: 2,
      }),
      undefined,
      'Sessions',
    );
  });
});
