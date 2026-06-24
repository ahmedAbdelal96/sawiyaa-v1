import { CareChatRequestRepository } from '../repositories/care-chat-request.repository';
import { CareChatExpirySweeperService } from './care-chat-expiry-sweeper.service';

describe('CareChatExpirySweeperService', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it('schedules a delayed first run and a daily interval without sweeping immediately', () => {
    const setTimeoutSpy = jest
      .spyOn(global, 'setTimeout')
      .mockImplementation(((handler: TimerHandler) => {
        return { unref: jest.fn() } as unknown as NodeJS.Timeout;
      }) as typeof setTimeout);
    const setIntervalSpy = jest
      .spyOn(global, 'setInterval')
      .mockImplementation(((handler: TimerHandler) => {
        return { unref: jest.fn() } as unknown as NodeJS.Timeout;
      }) as typeof setInterval);
    const repository = {
      expirePendingDueRequests: jest.fn().mockResolvedValue({ count: 0 }),
    } as unknown as CareChatRequestRepository;
    const service = new CareChatExpirySweeperService(repository);

    void service.onApplicationBootstrap();

    expect(repository.expirePendingDueRequests).not.toHaveBeenCalled();
    expect(setTimeoutSpy).toHaveBeenCalledWith(
      expect.any(Function),
      3 * 60 * 1000,
    );
    expect(setIntervalSpy).not.toHaveBeenCalled();
  });

  it('runs a single batch update and logs the expired count', async () => {
    const repository = {
      expirePendingDueRequests: jest.fn().mockResolvedValue({ count: 7 }),
    } as unknown as CareChatRequestRepository;
    const service = new CareChatExpirySweeperService(repository);

    const logSpy = jest.spyOn((service as any).logger, 'log');

    const count = await service.sweepOnce(
      new Date('2026-06-22T10:00:00.000Z'),
    );

    expect(count).toBe(7);
    expect(repository.expirePendingDueRequests).toHaveBeenCalledWith({
      now: new Date('2026-06-22T10:00:00.000Z'),
    });
    expect(logSpy).toHaveBeenCalledWith('Care chat expiry sweep started');
    expect(logSpy).toHaveBeenCalledWith(
      'Care chat expiry sweep completed: expired=7',
    );
  });
});
