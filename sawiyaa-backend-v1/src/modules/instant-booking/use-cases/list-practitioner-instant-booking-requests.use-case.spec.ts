import { InstantBookingRequestStatus, SessionMode } from '@prisma/client';
import { InstantBookingMapper } from '../mappers/instant-booking.mapper';
import { ListPractitionerInstantBookingRequestsUseCase } from './list-practitioner-instant-booking-requests.use-case';

describe('ListPractitionerInstantBookingRequestsUseCase', () => {
  const instantBookingPractitionerRepository = {
    findByUserId: jest.fn(),
  } as never;
  const instantBookingRequestRepository = {
    markExpired: jest.fn(),
    listPractitionerRequests: jest.fn(),
  } as never;
  const instantBookingMapper = new InstantBookingMapper();

  const useCase = new ListPractitionerInstantBookingRequestsUseCase(
    instantBookingPractitionerRepository,
    instantBookingRequestRepository,
    instantBookingMapper,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('lists only the authenticated practitioner requests and expires stale ones first', async () => {
    (instantBookingPractitionerRepository.findByUserId as jest.Mock).mockResolvedValue({
      id: 'practitioner-1',
    });
    (instantBookingRequestRepository.listPractitionerRequests as jest.Mock).mockResolvedValue([
      {
        id: 'request-1',
        status: InstantBookingRequestStatus.PENDING,
        requestedDurationMinutes: 30,
        sessionMode: SessionMode.VIDEO,
        requestedAt: new Date('2026-06-15T10:00:00.000Z'),
        expiresAt: new Date('2026-06-15T10:05:00.000Z'),
        respondedAt: null,
        responseReason: null,
        linkedSessionId: null,
        practitioner: {
          id: 'practitioner-1',
          publicSlug: 'dr-sarah',
          user: {
            displayName: 'Dr. Sarah',
          },
        },
        patient: {
          id: 'patient-1',
          user: {
            displayName: 'Mona',
          },
        },
      },
      {
        id: 'request-2',
        status: InstantBookingRequestStatus.ACCEPTED,
        requestedDurationMinutes: 60,
        sessionMode: SessionMode.AUDIO,
        requestedAt: new Date('2026-06-15T09:00:00.000Z'),
        expiresAt: new Date('2026-06-15T09:05:00.000Z'),
        respondedAt: new Date('2026-06-15T09:01:00.000Z'),
        responseReason: 'accepted',
        linkedSessionId: 'session-1',
        practitioner: {
          id: 'practitioner-1',
          publicSlug: 'dr-sarah',
          user: {
            displayName: 'Dr. Sarah',
          },
        },
        patient: null,
      },
    ]);

    const result = await useCase.execute({
      userId: 'user-1',
      locale: 'ar',
    });

    expect(instantBookingPractitionerRepository.findByUserId).toHaveBeenCalledWith('user-1');
    expect(instantBookingRequestRepository.markExpired).toHaveBeenCalled();
    expect(instantBookingRequestRepository.markExpired).toHaveBeenCalledWith(
      expect.any(Date),
      { practitionerId: 'practitioner-1' },
    );
    expect(instantBookingRequestRepository.listPractitionerRequests).toHaveBeenCalledWith(
      'practitioner-1',
    );
    expect(result.items).toHaveLength(2);
    expect(result.items[0]).toMatchObject({
      id: 'request-1',
      status: InstantBookingRequestStatus.PENDING,
      practitioner: {
        id: 'practitioner-1',
        slug: 'dr-sarah',
        displayName: 'Dr. Sarah',
      },
      patient: {
        id: 'patient-1',
        displayName: 'Mona',
      },
    });
    expect(result.items[1]).toMatchObject({
      id: 'request-2',
      status: InstantBookingRequestStatus.ACCEPTED,
      createdSessionId: 'session-1',
    });
  });

  it('throws when the authenticated user is not a practitioner', async () => {
    (instantBookingPractitionerRepository.findByUserId as jest.Mock).mockResolvedValue(null);

    await expect(
      useCase.execute({
        userId: 'user-2',
        locale: 'ar',
      }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        messageKey: 'instantBooking.errors.practitionerNotFound',
        error: 'INSTANT_BOOKING_PRACTITIONER_NOT_FOUND',
      }),
    });
  });
});
