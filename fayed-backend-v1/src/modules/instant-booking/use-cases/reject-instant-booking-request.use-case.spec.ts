import { InstantBookingRequestStatus } from '@prisma/client';
import { OperationalNotificationService } from '@modules/notifications/services/operational-notification.service';
import { InstantBookingMapper } from '../mappers/instant-booking.mapper';
import { InstantBookingPractitionerRepository } from '../repositories/instant-booking-practitioner.repository';
import { InstantBookingRequestRepository } from '../repositories/instant-booking-request.repository';
import { ValidateInstantBookingStatusTransitionService } from '../services/validate-instant-booking-status-transition.service';
import { RejectInstantBookingRequestUseCase } from './reject-instant-booking-request.use-case';

describe('RejectInstantBookingRequestUseCase', () => {
  const practitionerRepository = {
    findByUserId: jest.fn(),
  } as unknown as InstantBookingPractitionerRepository;

  const requestRepository = {
    markExpired: jest.fn(),
    findById: jest.fn(),
    rejectPendingRequest: jest.fn(),
  } as unknown as InstantBookingRequestRepository;

  const statusTransitionService = {
    assertCanTransition: jest.fn(),
  } as unknown as ValidateInstantBookingStatusTransitionService;

  const notificationService = {
    notifyInstantBookingRejected: jest.fn(),
  } as unknown as OperationalNotificationService;

  const mapper = {
    toViewModel: jest.fn((request) => request),
  } as unknown as InstantBookingMapper;

  const useCase = new RejectInstantBookingRequestUseCase(
    practitionerRepository,
    requestRepository,
    statusTransitionService,
    notificationService,
    mapper,
  );

  const practitioner = {
    id: 'practitioner-1',
    userId: 'pr-user-1',
  };

  const pendingRequest = {
    id: 'request-1',
    status: InstantBookingRequestStatus.PENDING,
    linkedSessionId: null,
    practitioner: { id: practitioner.id },
    patient: { id: 'patient-1' },
  };

  const rejectedRequest = {
    ...pendingRequest,
    status: InstantBookingRequestStatus.REJECTED,
    respondedAt: new Date('2026-06-17T10:00:00.000Z'),
    responseReason: 'not available',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (practitionerRepository.findByUserId as jest.Mock).mockResolvedValue(
      practitioner,
    );
    (requestRepository.markExpired as jest.Mock).mockResolvedValue({
      count: 0,
    });
    (requestRepository.findById as jest.Mock).mockImplementation(
      (_requestId: string, tx?: unknown) =>
        Promise.resolve(tx ? rejectedRequest : pendingRequest),
    );
    (requestRepository.rejectPendingRequest as jest.Mock).mockResolvedValue({
      count: 1,
    });
  });

  it('rejects a pending request and notifies the patient once', async () => {
    (requestRepository.findById as jest.Mock)
      .mockImplementationOnce(() => Promise.resolve(pendingRequest))
      .mockImplementationOnce(() => Promise.resolve(rejectedRequest));

    const result = await useCase.execute({
      userId: practitioner.userId,
      locale: 'ar',
      requestId: pendingRequest.id,
      reason: 'not available',
    });

    expect(requestRepository.rejectPendingRequest).toHaveBeenCalledWith({
      requestId: pendingRequest.id,
      practitionerId: practitioner.id,
      now: expect.any(Date),
      reason: 'not available',
    });
    expect(notificationService.notifyInstantBookingRejected).toHaveBeenCalledWith(
      {
        patientProfileId: 'patient-1',
        requestId: pendingRequest.id,
      },
    );
    expect(result.item).toBe(rejectedRequest);
  });

  it('does not reject again when the request is already rejected', async () => {
    (requestRepository.findById as jest.Mock).mockImplementationOnce(
      () =>
        Promise.resolve({
          ...pendingRequest,
          status: InstantBookingRequestStatus.REJECTED,
        }),
    );

    await expect(
      useCase.execute({
        userId: practitioner.userId,
        locale: 'ar',
        requestId: pendingRequest.id,
      }),
    ).rejects.toThrow();

    expect(notificationService.notifyInstantBookingRejected).not.toHaveBeenCalled();
  });
});
