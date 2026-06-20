import { ConflictException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SessionMode, SessionStatus } from '@prisma/client';
import { PublicPractitionerVisibilityPolicy } from '@modules/practitioners/policies/public-practitioner-visibility.policy';
import { CreateScheduledSessionUseCase } from './create-scheduled-session.use-case';

describe('CreateScheduledSessionUseCase', () => {
  const configService = {
    get: jest.fn((key: string, defaultValue?: number) =>
      key === 'session.paymentReservationMinutes' ? 15 : defaultValue,
    ),
  } as unknown as ConfigService;

  const prisma: any = {
    $transaction: jest.fn(async (callback: (tx: never) => Promise<unknown>) =>
      callback({} as never),
    ),
  };

  const sessionPatientRepository: any = {
    findByUserId: jest.fn(),
  };

  const sessionPractitionerRepository: any = {
    findByPublicSlug: jest.fn(),
  };

  const sessionRepository: any = {
    reserveNextSessionCode: jest.fn(),
    createSession: jest.fn(),
    createEvent: jest.fn(),
  };

  const sessionMapper: any = {
    toDetails: jest.fn((session) => session),
  };

  const validateSessionDurationService: any = {
    validate: jest.fn(),
  };

  const validateSessionBookingRequestService: any = {
    assertUtcDateIsValid: jest.fn(),
    assertScheduledStartIsFuture: jest.fn(),
  };

  const validateSessionScheduleCompatibilityService: any = {
    assertFitsPractitionerAvailability: jest.fn(),
  };

  const validateSessionConflictsService: any = {
    assertNoPractitionerConflict: jest.fn(),
    assertNoPatientConflict: jest.fn(),
  };

  const publicPractitionerVisibilityPolicy = {
    evaluate: jest.fn(() => ({ isVisible: true })),
  } as unknown as PublicPractitionerVisibilityPolicy;

  const useCase = new CreateScheduledSessionUseCase(
    configService,
    prisma,
    sessionPatientRepository,
    sessionPractitionerRepository,
    sessionRepository,
    sessionMapper,
    validateSessionDurationService,
    validateSessionBookingRequestService,
    validateSessionScheduleCompatibilityService,
    validateSessionConflictsService,
    publicPractitionerVisibilityPolicy,
  );

  const patient = {
    id: 'patient-1',
  };

  const practitioner = {
    id: 'practitioner-1',
    status: 'APPROVED',
    user: {
      status: 'ACTIVE',
      timezone: 'Africa/Cairo',
      displayName: 'Dr Y',
    },
    isPublicProfilePublished: true,
    publicSlug: 'dr-youssef',
    professionalTitle: 'Therapist',
    bio: 'Bio',
    specialties: [{ id: 'specialty-1' }],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (sessionPatientRepository.findByUserId as jest.Mock).mockResolvedValue(
      patient,
    );
    (sessionPractitionerRepository.findByPublicSlug as jest.Mock).mockResolvedValue(
      practitioner,
    );
    (validateSessionDurationService.validate as jest.Mock).mockReturnValue(
      undefined,
    );
    (
      validateSessionBookingRequestService.assertUtcDateIsValid as jest.Mock
    ).mockReturnValue(undefined);
    (
      validateSessionBookingRequestService.assertScheduledStartIsFuture as jest.Mock
    ).mockReturnValue(undefined);
    (
      validateSessionScheduleCompatibilityService.assertFitsPractitionerAvailability as jest.Mock
    ).mockResolvedValue({
      timezone: 'Africa/Cairo',
    });
    (
      validateSessionConflictsService.assertNoPractitionerConflict as jest.Mock
    ).mockResolvedValue(undefined);
    (
      validateSessionConflictsService.assertNoPatientConflict as jest.Mock
    ).mockResolvedValue(undefined);
    (sessionRepository.reserveNextSessionCode as jest.Mock).mockResolvedValue(
      'SES-2999-000001',
    );
    (sessionRepository.createSession as jest.Mock).mockResolvedValue({
      id: 'session-1',
      sessionCode: 'SES-2999-000001',
      status: SessionStatus.PENDING_PAYMENT,
      scheduledStartAt: new Date('2999-01-01T10:00:00.000Z'),
      scheduledEndAt: new Date('2999-01-01T11:00:00.000Z'),
      durationMinutes: 60,
      sessionMode: SessionMode.VIDEO,
    });
    (sessionRepository.createEvent as jest.Mock).mockResolvedValue(undefined);
  });

  it('creates a pending-payment session on the happy path', async () => {
    const result = await useCase.execute({
      userId: 'user-1',
      locale: 'en',
      practitionerSlug: 'dr-youssef',
      scheduledStartAt: '2999-01-01T10:00:00.000Z',
      durationMinutes: 60,
      sessionMode: SessionMode.VIDEO,
    });

    expect(sessionRepository.createSession).toHaveBeenCalledWith(
      expect.objectContaining({
        patientId: 'patient-1',
        practitionerId: 'practitioner-1',
        status: SessionStatus.PENDING_PAYMENT,
        durationMinutes: 60,
        scheduledStartAt: new Date('2999-01-01T10:00:00.000Z'),
        scheduledEndAt: new Date('2999-01-01T11:00:00.000Z'),
      }),
      expect.anything(),
    );
    expect(result.item.id).toBe('session-1');
  });

  it('maps session overlap exclusion violations to a conflict exception', async () => {
    (sessionRepository.createSession as jest.Mock).mockRejectedValueOnce({
      code: '23P01',
      message:
        'conflicting key value violates exclusion constraint "Session_practitioner_time_no_overlap_excl"',
      meta: {
        constraint: 'Session_practitioner_time_no_overlap_excl',
      },
    });

    const error = await useCase
      .execute({
        userId: 'user-1',
        locale: 'en',
        practitionerSlug: 'dr-youssef',
        scheduledStartAt: '2999-01-01T10:00:00.000Z',
        durationMinutes: 60,
        sessionMode: SessionMode.VIDEO,
      })
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ConflictException);
    expect(JSON.stringify((error as ConflictException).getResponse())).not.toContain(
      '23P01',
    );
    expect(JSON.stringify((error as ConflictException).getResponse())).not.toContain(
      'Session_practitioner_time_no_overlap_excl',
    );
  });

  it('rejects missing patient records before attempting session creation', async () => {
    (sessionPatientRepository.findByUserId as jest.Mock).mockResolvedValueOnce(
      null,
    );

    await expect(
      useCase.execute({
        userId: 'user-1',
        locale: 'en',
        practitionerSlug: 'dr-youssef',
        scheduledStartAt: '2999-01-01T10:00:00.000Z',
        durationMinutes: 60,
        sessionMode: SessionMode.VIDEO,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
