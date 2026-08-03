import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
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

  const tx = { practitionerProfile: { findUnique: jest.fn() } };
  const prisma: any = {
    $transaction: jest.fn(async (callback: (tx: never) => Promise<unknown>) =>
      callback(tx as never),
    ),
  };

  const sessionPatientRepository: any = {
    findByUserId: jest.fn(),
  };

  const sessionPractitionerRepository: any = {
    findByPublicSlug: jest.fn(),
  };

  const sessionRepository: any = {
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
    assertScheduledStartHasExplicitTimezone: jest.fn(),
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
    acceptsNormalBookings: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (
      validateSessionBookingRequestService.assertScheduledStartHasExplicitTimezone as jest.Mock
    ).mockImplementation(() => undefined);
    (sessionPatientRepository.findByUserId as jest.Mock).mockResolvedValue(
      patient,
    );
    (
      sessionPractitionerRepository.findByPublicSlug as jest.Mock
    ).mockResolvedValue(practitioner);
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
    tx.practitionerProfile.findUnique.mockResolvedValue({
      acceptsNormalBookings: true,
    });
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
      'scheduled',
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
    expect(
      JSON.stringify((error as ConflictException).getResponse()),
    ).not.toContain('23P01');
    expect(
      JSON.stringify((error as ConflictException).getResponse()),
    ).not.toContain('Session_practitioner_time_no_overlap_excl');
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

  it('requires an explicit timezone on the scheduled start input', async () => {
    (
      validateSessionBookingRequestService.assertScheduledStartHasExplicitTimezone as jest.Mock
    ).mockImplementation(() => {
      throw new BadRequestException({
        error: 'SESSION_SCHEDULED_START_TIMEZONE_REQUIRED',
      });
    });

    await expect(
      useCase.execute({
        userId: 'patient-user-1',
        locale: 'en',
        practitionerSlug: 'dr-youssef',
        scheduledStartAt: '2026-08-10T10:00:00',
        durationMinutes: 30,
        sessionMode: SessionMode.VIDEO,
      }),
    ).rejects.toMatchObject({
      response: { error: 'SESSION_SCHEDULED_START_TIMEZONE_REQUIRED' },
    });

    expect(sessionPatientRepository.findByUserId).not.toHaveBeenCalled();
  });

  it('rejects paused normal booking intake before any booking side effect', async () => {
    (
      sessionPractitionerRepository.findByPublicSlug as jest.Mock
    ).mockResolvedValueOnce({
      ...practitioner,
      acceptsNormalBookings: false,
    });

    await expect(
      useCase.execute({
        userId: 'user-1',
        locale: 'en',
        practitionerSlug: 'dr-youssef',
        scheduledStartAt: '2999-01-01T10:00:00.000Z',
        durationMinutes: 60,
        sessionMode: SessionMode.VIDEO,
      }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ error: 'NORMAL_BOOKINGS_PAUSED' }),
    });

    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(sessionRepository.createSession).not.toHaveBeenCalled();
  });

  it('re-checks normal booking intake inside the transaction for stale submissions', async () => {
    tx.practitionerProfile.findUnique.mockResolvedValueOnce({
      acceptsNormalBookings: false,
    });

    await expect(
      useCase.execute({
        userId: 'user-1',
        locale: 'en',
        practitionerSlug: 'dr-youssef',
        scheduledStartAt: '2999-01-01T10:00:00.000Z',
        durationMinutes: 60,
        sessionMode: SessionMode.VIDEO,
      }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ error: 'NORMAL_BOOKINGS_PAUSED' }),
    });

    expect(sessionRepository.createSession).not.toHaveBeenCalled();
  });

  it('rejects a past scheduled start through the booking-request guard before availability validation', async () => {
    (
      validateSessionBookingRequestService.assertScheduledStartIsFuture as jest.Mock
    ).mockImplementationOnce(() => {
      throw new BadRequestException('past');
    });

    await expect(
      useCase.execute({
        userId: 'user-1',
        locale: 'en',
        practitionerSlug: 'dr-youssef',
        scheduledStartAt: '2020-01-01T10:00:00.000Z',
        durationMinutes: 60,
        sessionMode: SessionMode.VIDEO,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(
      validateSessionScheduleCompatibilityService.assertFitsPractitionerAvailability,
    ).not.toHaveBeenCalled();
  });
});
