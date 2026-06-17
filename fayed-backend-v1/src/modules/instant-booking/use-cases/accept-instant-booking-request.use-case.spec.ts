import { ConflictException } from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { InstantBookingRequestStatus, SessionMode } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { OperationalNotificationService } from '@modules/notifications/services/operational-notification.service';
import { InstantBookingMapper } from '../mappers/instant-booking.mapper';
import { InstantBookingPractitionerRepository } from '../repositories/instant-booking-practitioner.repository';
import { InstantBookingRequestRepository } from '../repositories/instant-booking-request.repository';
import { CreateSessionFromInstantBookingService } from '../services/create-session-from-instant-booking.service';
import { ValidateInstantBookingEligibilityService } from '../services/validate-instant-booking-eligibility.service';
import { ValidateInstantBookingStatusTransitionService } from '../services/validate-instant-booking-status-transition.service';
import { AcceptInstantBookingRequestUseCase } from './accept-instant-booking-request.use-case';

describe('AcceptInstantBookingRequestUseCase', () => {
  const practitionerRepository = {
    findByUserId: jest.fn(),
  } as unknown as InstantBookingPractitionerRepository;

  const requestRepository = {
    markExpired: jest.fn(),
    findById: jest.fn(),
    claimPendingRequestForAcceptance: jest.fn(),
    updateRequest: jest.fn(),
  } as unknown as InstantBookingRequestRepository;

  const eligibilityService = {
    assertPractitionerCanReceiveInstantBooking: jest.fn(),
  } as unknown as ValidateInstantBookingEligibilityService;

  const statusTransitionService = {
    assertCanTransition: jest.fn(),
  } as unknown as ValidateInstantBookingStatusTransitionService;

  const createSessionService = {
    createFromAcceptedRequest: jest.fn(),
  } as unknown as CreateSessionFromInstantBookingService;

  const notificationService = {
    notifyInstantBookingAccepted: jest.fn(),
  } as unknown as OperationalNotificationService;

  const mapper = {
    toViewModel: jest.fn((request) => request),
  } as unknown as InstantBookingMapper;

  const prisma = {
    $transaction: jest.fn(),
  } as unknown as PrismaService;

  const useCase = new AcceptInstantBookingRequestUseCase(
    prisma,
    practitionerRepository,
    requestRepository,
    eligibilityService,
    statusTransitionService,
    createSessionService,
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
    requestedDurationMinutes: 30,
    preferredMode: SessionMode.VIDEO,
    practitioner: { id: practitioner.id },
    patient: { id: 'patient-1' },
  };

  const claimedRequest = {
    ...pendingRequest,
    status: InstantBookingRequestStatus.ACCEPTED,
    respondedAt: new Date('2026-06-17T10:00:00.000Z'),
  };

  const acceptedRequest = {
    ...claimedRequest,
    linkedSessionId: 'session-1',
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
      (_requestId: string, tx?: unknown) => {
        if (tx) {
          return Promise.resolve(claimedRequest);
        }

        return Promise.resolve(pendingRequest);
      },
    );
    (requestRepository.claimPendingRequestForAcceptance as jest.Mock).mockResolvedValue({
      count: 1,
    });
    (requestRepository.updateRequest as jest.Mock).mockResolvedValue(
      acceptedRequest,
    );
    (eligibilityService.assertPractitionerCanReceiveInstantBooking as jest.Mock).mockResolvedValue(
      {
        startsAtUtc: new Date('2026-06-17T10:00:00.000Z'),
        endsAtUtc: new Date('2026-06-17T10:30:00.000Z'),
        timezone: 'Africa/Cairo',
      },
    );
    (createSessionService.createFromAcceptedRequest as jest.Mock).mockResolvedValue(
      { id: 'session-1' },
    );
    (prisma.$transaction as jest.Mock).mockImplementation(async (cb) =>
      cb({} as never),
    );
  });

  it('accepts a pending request, creates a session, and notifies the patient', async () => {
    const result = await useCase.execute({
      userId: practitioner.userId,
      locale: 'ar',
      requestId: pendingRequest.id,
    });

    expect(requestRepository.claimPendingRequestForAcceptance).toHaveBeenCalledWith(
      {
        requestId: pendingRequest.id,
        practitionerId: practitioner.id,
        now: expect.any(Date),
      },
      expect.any(Object),
    );
    expect(createSessionService.createFromAcceptedRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        request: expect.objectContaining({
          id: pendingRequest.id,
          status: InstantBookingRequestStatus.ACCEPTED,
        }),
        actorUserId: practitioner.userId,
        timezone: 'Africa/Cairo',
      }),
    );
    expect(notificationService.notifyInstantBookingAccepted).toHaveBeenCalledWith(
      {
        patientProfileId: 'patient-1',
        requestId: pendingRequest.id,
      },
    );
    expect(result.item).toBe(acceptedRequest);
  });

  it('fails gracefully when another accept already won the race', async () => {
    (requestRepository.claimPendingRequestForAcceptance as jest.Mock).mockResolvedValueOnce(
      { count: 0 },
    );
    (requestRepository.findById as jest.Mock)
      .mockResolvedValueOnce(pendingRequest)
      .mockResolvedValueOnce(acceptedRequest);

    await expect(
      useCase.execute({
        userId: practitioner.userId,
        locale: 'ar',
        requestId: pendingRequest.id,
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(createSessionService.createFromAcceptedRequest).not.toHaveBeenCalled();
    expect(notificationService.notifyInstantBookingAccepted).not.toHaveBeenCalled();
  });

  it('remaps Prisma unique-constraint failures to a domain conflict', async () => {
    (prisma.$transaction as jest.Mock).mockRejectedValueOnce(
      new PrismaClientKnownRequestError('Unique constraint', {
        code: 'P2002',
        clientVersion: '5.0.0',
      }),
    );

    await expect(
      useCase.execute({
        userId: practitioner.userId,
        locale: 'ar',
        requestId: pendingRequest.id,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
