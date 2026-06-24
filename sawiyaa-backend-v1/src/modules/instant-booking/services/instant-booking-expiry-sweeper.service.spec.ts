import { InstantBookingRequestRepository } from '../repositories/instant-booking-request.repository';
import { ExpireInstantBookingRequestUseCase } from '../use-cases/expire-instant-booking-request.use-case';
import { InstantBookingExpirySweeperService } from './instant-booking-expiry-sweeper.service';

describe('InstantBookingExpirySweeperService', () => {
  const requestRepository = {
    listPendingRequestsDueForExpiry: jest.fn(),
  } as unknown as InstantBookingRequestRepository;

  const expireInstantBookingRequestUseCase = {
    execute: jest.fn(),
  } as unknown as ExpireInstantBookingRequestUseCase;

  const service = new InstantBookingExpirySweeperService(
    requestRepository,
    expireInstantBookingRequestUseCase,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sweeps expirable instant booking requests in batches and remains safe on repeat runs', async () => {
    (requestRepository.listPendingRequestsDueForExpiry as jest.Mock)
      .mockResolvedValueOnce([
        { id: 'request-1' },
        { id: 'request-2' },
      ])
      .mockResolvedValueOnce([]);
    (expireInstantBookingRequestUseCase.execute as jest.Mock)
      .mockResolvedValueOnce({ item: { id: 'request-1' } })
      .mockResolvedValueOnce({ item: { id: 'request-2' } });

    const expiredCount = await service.sweepOnce(
      new Date('2026-06-17T10:00:00.000Z'),
    );

    expect(requestRepository.listPendingRequestsDueForExpiry).toHaveBeenCalledWith(
      new Date('2026-06-17T10:00:00.000Z'),
      50,
    );
    expect(expireInstantBookingRequestUseCase.execute).toHaveBeenCalledTimes(2);
    expect(expiredCount).toBe(2);
  });

  it('ignores overlapping sweep calls while a run is already in progress', async () => {
    let resolveCandidates: ((value: Array<{ id: string }>) => void) | null =
      null;
    (requestRepository.listPendingRequestsDueForExpiry as jest.Mock).mockImplementation(
      () =>
        new Promise<Array<{ id: string }>>((resolve) => {
          resolveCandidates = resolve;
        }),
    );

    const activeSweep = service.sweepOnce(new Date('2026-06-17T10:00:00.000Z'));
    const skippedSweep = await service.sweepOnce(
      new Date('2026-06-17T10:00:00.000Z'),
    );

    resolveCandidates?.([]);
    await activeSweep;

    expect(skippedSweep).toBe(0);
  });
});
