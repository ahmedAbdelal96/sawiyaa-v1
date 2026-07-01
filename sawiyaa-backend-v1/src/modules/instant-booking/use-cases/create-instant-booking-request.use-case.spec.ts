import { SessionMode } from '@prisma/client';
import { InstantBookingMapper } from '../mappers/instant-booking.mapper';
import { InstantBookingPatientRepository } from '../repositories/instant-booking-patient.repository';
import { InstantBookingPractitionerRepository } from '../repositories/instant-booking-practitioner.repository';
import { InstantBookingRequestRepository } from '../repositories/instant-booking-request.repository';
import { ValidateInstantBookingEligibilityService } from '../services/validate-instant-booking-eligibility.service';
import { CreateInstantBookingRequestUseCase } from './create-instant-booking-request.use-case';

describe('CreateInstantBookingRequestUseCase', () => {
  const patientRepository = {
    findByUserId: jest.fn(),
  } as unknown as InstantBookingPatientRepository;

  const practitionerRepository = {
    findByPublicSlug: jest.fn(),
  } as unknown as InstantBookingPractitionerRepository;

  const requestRepository = {
    markExpired: jest.fn(),
    findConflictingPendingRequests: jest.fn(),
    createRequest: jest.fn(),
  } as unknown as InstantBookingRequestRepository;

  const eligibilityService = {
    assertPractitionerCanReceiveInstantBooking: jest.fn(),
  } as unknown as ValidateInstantBookingEligibilityService;

  const mapper = {
    toViewModel: jest.fn((request) => ({
      id: request.id,
      requestedDurationMinutes: request.requestedDurationMinutes,
      status: request.status,
      metadataJson: request.metadataJson,
    })),
  } as unknown as InstantBookingMapper;

  const useCase = new CreateInstantBookingRequestUseCase(
    patientRepository,
    practitionerRepository,
    requestRepository,
    eligibilityService,
    mapper,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    (patientRepository.findByUserId as jest.Mock).mockResolvedValue({
      id: 'patient-1',
    });
    (practitionerRepository.findByPublicSlug as jest.Mock).mockResolvedValue({
      id: 'practitioner-1',
      instantBookingPrice30Egp: '410.00',
      instantBookingPrice60Egp: '720.00',
      instantBookingPrice30Usd: '24.00',
      instantBookingPrice60Usd: '42.00',
    });
    (requestRepository.findConflictingPendingRequests as jest.Mock).mockResolvedValue(
      [],
    );
    (requestRepository.createRequest as jest.Mock).mockImplementation(async (input) => ({
      id: 'request-1',
      requestedDurationMinutes: input.requestedDurationMinutes,
      status: 'PENDING',
      metadataJson: input.metadataJson,
    }));
  });

  it('stores a frozen pricing snapshot in request metadata', async () => {
    const result = await useCase.execute({
      userId: 'user-1',
      locale: 'ar',
      practitionerSlug: 'dr-youssef',
      durationMinutes: 30,
      sessionMode: SessionMode.VIDEO,
    });

    expect(requestRepository.createRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        patientId: 'patient-1',
        practitionerId: 'practitioner-1',
        requestedDurationMinutes: 30,
        metadataJson: expect.objectContaining({
          source: 'instant-booking-request',
          requestedDurationMinutes: 30,
          pricingSnapshot: {
            EGP: {
              30: '410.00',
              60: '720.00',
            },
            USD: {
              30: '24.00',
              60: '42.00',
            },
          },
        }),
      }),
    );

    expect(result.item.id).toBe('request-1');
    expect(result.item.metadataJson).toMatchObject({
      pricingSnapshot: {
        EGP: {
          30: '410.00',
          60: '720.00',
        },
        USD: {
          30: '24.00',
          60: '42.00',
        },
      },
    });
  });

  it('bubbles eligibility rejection without creating a request', async () => {
    (eligibilityService.assertPractitionerCanReceiveInstantBooking as jest.Mock).mockRejectedValueOnce(
      new Error('not-available'),
    );

    await expect(
      useCase.execute({
        userId: 'user-1',
        locale: 'ar',
        practitionerSlug: 'dr-youssef',
        durationMinutes: 30,
        sessionMode: SessionMode.VIDEO,
      }),
    ).rejects.toThrow('not-available');

    expect(requestRepository.createRequest).not.toHaveBeenCalled();
  });
});
