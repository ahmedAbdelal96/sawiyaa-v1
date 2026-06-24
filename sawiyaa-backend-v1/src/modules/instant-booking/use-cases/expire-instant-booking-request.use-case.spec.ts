import { InstantBookingRequestStatus } from '@prisma/client';
import { OperationalNotificationService } from '@modules/notifications/services/operational-notification.service';
import { InstantBookingMapper } from '../mappers/instant-booking.mapper';
import { InstantBookingRequestRepository } from '../repositories/instant-booking-request.repository';
import { ValidateInstantBookingStatusTransitionService } from '../services/validate-instant-booking-status-transition.service';
import { ExpireInstantBookingRequestUseCase } from './expire-instant-booking-request.use-case';

describe('ExpireInstantBookingRequestUseCase', () => {
  const requestRepository = {
    findById: jest.fn(),
    expirePendingRequest: jest.fn(),
  } as unknown as InstantBookingRequestRepository;

  const statusTransitionService = {
    assertCanTransition: jest.fn(),
  } as unknown as ValidateInstantBookingStatusTransitionService;

  const notificationService = {
    notifyInstantBookingExpired: jest.fn(),
  } as unknown as OperationalNotificationService;

  const mapper = {
    toViewModel: jest.fn((request) => request),
  } as unknown as InstantBookingMapper;

  const useCase = new ExpireInstantBookingRequestUseCase(
    requestRepository,
    statusTransitionService,
    notificationService,
    mapper,
  );

  const pendingRequest = {
    id: 'request-1',
    status: InstantBookingRequestStatus.PENDING,
    linkedSessionId: null,
    patient: { id: 'patient-1' },
  };

  const expiredRequest = {
    ...pendingRequest,
    status: InstantBookingRequestStatus.EXPIRED,
    respondedAt: new Date('2026-06-17T10:00:00.000Z'),
    responseReason: 'expired',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (requestRepository.findById as jest.Mock).mockImplementation(
      (_requestId: string) => Promise.resolve(pendingRequest),
    );
    (requestRepository.expirePendingRequest as jest.Mock).mockResolvedValue({
      count: 1,
    });
  });

  it('expires a pending request and notifies the patient once', async () => {
    (requestRepository.findById as jest.Mock)
      .mockImplementationOnce(() => Promise.resolve(pendingRequest))
      .mockImplementationOnce(() => Promise.resolve(expiredRequest));

    const result = await useCase.execute({
      requestId: pendingRequest.id,
    });

    expect(requestRepository.expirePendingRequest).toHaveBeenCalledWith({
      requestId: pendingRequest.id,
      now: expect.any(Date),
    });
    expect(notificationService.notifyInstantBookingExpired).toHaveBeenCalledWith({
      patientProfileId: 'patient-1',
      requestId: pendingRequest.id,
    });
    expect(result.item).toBe(expiredRequest);
  });

  it('returns an already-expired request without duplicating notifications', async () => {
    (requestRepository.expirePendingRequest as jest.Mock).mockResolvedValueOnce({
      count: 0,
    });
    (requestRepository.findById as jest.Mock)
      .mockImplementationOnce(() => Promise.resolve(expiredRequest))
      .mockImplementationOnce(() => Promise.resolve(expiredRequest));

    const result = await useCase.execute({
      requestId: pendingRequest.id,
    });

    expect(notificationService.notifyInstantBookingExpired).not.toHaveBeenCalled();
    expect(result.item).toBe(expiredRequest);
  });
});
