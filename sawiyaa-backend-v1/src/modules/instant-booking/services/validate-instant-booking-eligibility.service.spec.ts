import { ConflictException, PresenceStatus, SessionMode } from '@prisma/client';
import { ValidateInstantBookingEligibilityService } from './validate-instant-booking-eligibility.service';

describe('ValidateInstantBookingEligibilityService', () => {
  const publicPractitionerVisibilityPolicy = {
    evaluate: jest.fn(),
  } as never;
  const practitionerPresenceRepository = {
    createOrGetByPractitionerProfileId: jest.fn(),
  } as never;
  const practitionerAvailabilityWeekRepository = {
    findPublishedByPractitionerAndWeekStarts: jest.fn(),
  } as never;
  const availabilityExceptionRepository = {
    listActiveForRange: jest.fn(),
  } as never;
  const availabilityWeekCalendarService = {
    resolveCurrentAndNextWeekWindow: jest.fn(),
  } as never;
  const resolvePractitionerTimezoneService = {
    resolve: jest.fn(),
  } as never;
  const buildPublishedWeekAvailabilityWindowsService = {
    buildForRange: jest.fn(),
  } as never;
  const sessionRepository = {
    listBlockingSessionRangesInRangeForPractitioner: jest.fn(),
  } as never;
  const validateSessionDurationService = {
    validate: jest.fn(),
  } as never;
  const validateSessionConflictsService = {
    assertNoPractitionerConflict: jest.fn(),
  } as never;

  const service = new ValidateInstantBookingEligibilityService(
    publicPractitionerVisibilityPolicy,
    practitionerPresenceRepository,
    practitionerAvailabilityWeekRepository,
    availabilityExceptionRepository,
    availabilityWeekCalendarService,
    resolvePractitionerTimezoneService,
    buildPublishedWeekAvailabilityWindowsService,
    sessionRepository,
    validateSessionDurationService,
    validateSessionConflictsService,
  );

  const currentWeekStart = new Date('2026-05-03T00:00:00.000Z');
  const currentWeekEnd = new Date('2026-05-09T00:00:00.000Z');
  const nextWeekStart = new Date('2026-05-10T00:00:00.000Z');
  const nextWeekEnd = new Date('2026-05-16T00:00:00.000Z');

  const currentWeek = {
    id: 'week-current',
    weekStartDate: currentWeekStart,
    weekEndDate: currentWeekEnd,
    timezone: 'Africa/Cairo',
    status: 'PUBLISHED',
    slots: [
      {
        id: 'slot-current',
        weekday: 'THURSDAY',
        startMinuteOfDay: 720,
        endMinuteOfDay: 750,
        durationMinutes: 30,
        timezone: 'Africa/Cairo',
      },
    ],
  };

  const nextWeek = {
    id: 'week-next',
    weekStartDate: nextWeekStart,
    weekEndDate: nextWeekEnd,
    timezone: 'Africa/Cairo',
    status: 'PUBLISHED',
    slots: [
      {
        id: 'slot-next',
        weekday: 'THURSDAY',
        startMinuteOfDay: 780,
        endMinuteOfDay: 810,
        durationMinutes: 30,
        timezone: 'Africa/Cairo',
      },
    ],
  };

  const baseInput = {
    practitioner: {
      id: 'practitioner-1',
      status: 'APPROVED',
      isPublicProfilePublished: true,
      publicSlug: 'dr-youssef',
      professionalTitle: 'Therapist',
      bio: 'Bio',
      user: {
        status: 'ACTIVE',
        displayName: 'Doctor Name',
        timezone: 'Africa/Cairo',
      },
      specialties: [{ specialtyId: 'specialty-1' }],
    },
    durationMinutes: 30,
    sessionMode: SessionMode.VIDEO,
    nowUtc: new Date('2026-05-07T12:00:00.000Z'),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (publicPractitionerVisibilityPolicy.evaluate as jest.Mock).mockReturnValue({
      isVisible: true,
    });
    (
      practitionerPresenceRepository.createOrGetByPractitionerProfileId as jest.Mock
    ).mockResolvedValue({
      status: PresenceStatus.ONLINE,
      isInstantBookingEnabled: true,
      lastSeenAtUtc: new Date('2026-05-07T11:59:30.000Z'),
    });
    (
      practitionerAvailabilityWeekRepository.findPublishedByPractitionerAndWeekStarts as jest.Mock
    ).mockResolvedValue([currentWeek, nextWeek]);
    (availabilityExceptionRepository.listActiveForRange as jest.Mock).mockResolvedValue([]);
    (
      availabilityWeekCalendarService.resolveCurrentAndNextWeekWindow as jest.Mock
    ).mockReturnValue({
      currentWeek: {
        startDate: currentWeekStart,
        endDate: currentWeekEnd,
        startDateIso: '2026-05-03',
        endDateIso: '2026-05-09',
      },
      nextWeek: {
        startDate: nextWeekStart,
        endDate: nextWeekEnd,
        startDateIso: '2026-05-10',
        endDateIso: '2026-05-16',
      },
    });
    (resolvePractitionerTimezoneService.resolve as jest.Mock).mockReturnValue(
      'Africa/Cairo',
    );
    (
      buildPublishedWeekAvailabilityWindowsService.buildForRange as jest.Mock
    ).mockReturnValue([
      {
        startsAt: '2026-05-07T12:00:00.000Z',
        endsAt: '2026-05-07T12:30:00.000Z',
        durationMinutes: 30,
      },
    ]);
    (validateSessionDurationService.validate as jest.Mock).mockReturnValue(
      undefined,
    );
    (
      sessionRepository.listBlockingSessionRangesInRangeForPractitioner as jest.Mock
    ).mockResolvedValue([]);
    (
      validateSessionConflictsService.assertNoPractitionerConflict as jest.Mock
    ).mockResolvedValue(undefined);
  });

  it('rejects stale presence even when the stored status is ONLINE', async () => {
    (
      practitionerPresenceRepository.createOrGetByPractitionerProfileId as jest.Mock
    ).mockResolvedValueOnce({
      status: PresenceStatus.ONLINE,
      isInstantBookingEnabled: true,
      lastSeenAtUtc: new Date('2026-05-07T11:55:00.000Z'),
    });

    await expect(
      service.assertPractitionerCanReceiveInstantBooking(baseInput),
    ).rejects.toMatchObject({
      response: {
        error: 'INSTANT_BOOKING_PRACTITIONER_NOT_ONLINE',
      },
    });
  });

  it('allows instant booking when presence is fresh and published availability matches', async () => {
    await expect(
      service.assertPractitionerCanReceiveInstantBooking(baseInput),
    ).resolves.toMatchObject({
      startsAtUtc: new Date('2026-05-07T12:00:00.000Z'),
      endsAtUtc: new Date('2026-05-07T12:30:00.000Z'),
      timezone: 'Africa/Cairo',
    });

    expect(resolvePractitionerTimezoneService.resolve).toHaveBeenCalledWith({
      fallbackTimezone: 'Africa/Cairo',
    });
    expect(
      practitionerAvailabilityWeekRepository.findPublishedByPractitionerAndWeekStarts,
    ).toHaveBeenCalledWith('practitioner-1', [currentWeekStart, nextWeekStart]);
    expect(
      buildPublishedWeekAvailabilityWindowsService.buildForRange,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        timezone: 'Africa/Cairo',
        weeks: [currentWeek, nextWeek],
        exceptions: [],
        bookedSessions: [],
        fromUtc: new Date('2026-05-07T12:00:00.000Z'),
        toUtc: new Date('2026-05-07T12:30:00.000Z'),
        now: new Date('2026-05-07T12:00:00.000Z'),
      }),
    );
    expect(
      sessionRepository.listBlockingSessionRangesInRangeForPractitioner,
    ).toHaveBeenCalledWith(
      'practitioner-1',
      new Date('2026-05-07T12:30:00.000Z'),
      new Date('2026-05-07T12:00:00.000Z'),
      new Date('2026-05-07T12:00:00.000Z'),
    );
  });

  it('rejects when no published week exists', async () => {
    (
      practitionerAvailabilityWeekRepository.findPublishedByPractitionerAndWeekStarts as jest.Mock
    ).mockResolvedValueOnce([]);
    (
      buildPublishedWeekAvailabilityWindowsService.buildForRange as jest.Mock
    ).mockReturnValueOnce([]);

    await expect(
      service.assertPractitionerCanReceiveInstantBooking(baseInput),
    ).rejects.toMatchObject({
      response: {
        error: 'INSTANT_BOOKING_PRACTITIONER_NOT_AVAILABLE_NOW',
      },
    });
  });

  it('rejects when only draft weeks are available', async () => {
    (
      practitionerAvailabilityWeekRepository.findPublishedByPractitionerAndWeekStarts as jest.Mock
    ).mockResolvedValueOnce([]);
    (
      buildPublishedWeekAvailabilityWindowsService.buildForRange as jest.Mock
    ).mockReturnValueOnce([]);

    await expect(
      service.assertPractitionerCanReceiveInstantBooking(baseInput),
    ).rejects.toMatchObject({
      response: {
        error: 'INSTANT_BOOKING_PRACTITIONER_NOT_AVAILABLE_NOW',
      },
    });
  });

  it('rejects when only archived weeks are available', async () => {
    (
      practitionerAvailabilityWeekRepository.findPublishedByPractitionerAndWeekStarts as jest.Mock
    ).mockResolvedValueOnce([]);
    (
      buildPublishedWeekAvailabilityWindowsService.buildForRange as jest.Mock
    ).mockReturnValueOnce([]);

    await expect(
      service.assertPractitionerCanReceiveInstantBooking(baseInput),
    ).rejects.toMatchObject({
      response: {
        error: 'INSTANT_BOOKING_PRACTITIONER_NOT_AVAILABLE_NOW',
      },
    });
  });

  it('rejects when the published week window does not fully contain the requested slot', async () => {
    (
      buildPublishedWeekAvailabilityWindowsService.buildForRange as jest.Mock
    ).mockReturnValueOnce([
      {
        startsAt: '2026-05-07T12:00:00.000Z',
        endsAt: '2026-05-07T12:15:00.000Z',
        durationMinutes: 30,
      },
    ]);

    await expect(
      service.assertPractitionerCanReceiveInstantBooking(baseInput),
    ).rejects.toMatchObject({
      response: {
        error: 'INSTANT_BOOKING_PRACTITIONER_NOT_AVAILABLE_NOW',
      },
    });
  });

  it('rejects when an exception removes the current instant slot from the published window slice', async () => {
    (
      availabilityExceptionRepository.listActiveForRange as jest.Mock
    ).mockResolvedValueOnce([
      {
        id: 'exception-block',
        practitionerId: 'practitioner-1',
        availabilityWeekId: 'week-current',
        type: 'BLOCK',
        startsAtUtc: new Date('2026-05-07T12:00:00.000Z'),
        endsAtUtc: new Date('2026-05-07T12:30:00.000Z'),
        reason: null,
        source: 'MANUAL',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ] as any);
    (
      buildPublishedWeekAvailabilityWindowsService.buildForRange as jest.Mock
    ).mockReturnValueOnce([]);

    await expect(
      service.assertPractitionerCanReceiveInstantBooking(baseInput),
    ).rejects.toMatchObject({
      response: {
        error: 'INSTANT_BOOKING_PRACTITIONER_NOT_AVAILABLE_NOW',
      },
    });
  });

  it('passes overlapping blocking sessions into published-week availability calculation', async () => {
    (
      sessionRepository.listBlockingSessionRangesInRangeForPractitioner as jest.Mock
    ).mockResolvedValueOnce([
      {
        scheduledStartAt: new Date('2026-05-07T12:00:00.000Z'),
        scheduledEndAt: new Date('2026-05-07T12:30:00.000Z'),
      },
    ]);
    (
      validateSessionConflictsService.assertNoPractitionerConflict as jest.Mock
    ).mockRejectedValueOnce(new Error('conflict'));

    await expect(
      service.assertPractitionerCanReceiveInstantBooking(baseInput),
    ).rejects.toBeInstanceOf(Error);

    expect(
      buildPublishedWeekAvailabilityWindowsService.buildForRange,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        bookedSessions: [
          {
            startsAt: new Date('2026-05-07T12:00:00.000Z'),
            endsAt: new Date('2026-05-07T12:30:00.000Z'),
          },
        ],
      }),
    );
  });

  it('rejects if the requested instant slot falls outside the managed current/next week range', async () => {
    (
      availabilityWeekCalendarService.resolveCurrentAndNextWeekWindow as jest.Mock
    ).mockReturnValueOnce({
      currentWeek: {
        startDate: new Date('2026-05-10T00:00:00.000Z'),
        endDate: new Date('2026-05-16T00:00:00.000Z'),
        startDateIso: '2026-05-10',
        endDateIso: '2026-05-16',
      },
      nextWeek: {
        startDate: new Date('2026-05-17T00:00:00.000Z'),
        endDate: new Date('2026-05-23T00:00:00.000Z'),
        startDateIso: '2026-05-17',
        endDateIso: '2026-05-23',
      },
    });

    await expect(
      service.assertPractitionerCanReceiveInstantBooking(baseInput),
    ).rejects.toMatchObject({
      response: {
        error: 'INSTANT_BOOKING_PRACTITIONER_NOT_AVAILABLE_NOW',
      },
    });
  });

  it('uses the resolved practitioner timezone to compute current and next week boundaries', async () => {
    resolvePractitionerTimezoneService.resolve.mockReturnValue('Asia/Riyadh');
    await expect(
      service.assertPractitionerCanReceiveInstantBooking(baseInput),
    ).resolves.toMatchObject({
      timezone: 'Asia/Riyadh',
    });

    expect(availabilityWeekCalendarService.resolveCurrentAndNextWeekWindow).toHaveBeenCalledWith(
      {
        timezone: 'Asia/Riyadh',
        now: new Date('2026-05-07T12:00:00.000Z'),
      },
    );
  });

  it('rejects a partially overlapping instant slot', async () => {
    (
      buildPublishedWeekAvailabilityWindowsService.buildForRange as jest.Mock
    ).mockReturnValueOnce([
      {
        startsAt: '2026-05-07T12:00:00.000Z',
        endsAt: '2026-05-07T12:15:00.000Z',
        durationMinutes: 30,
      },
    ]);

    await expect(
      service.assertPractitionerCanReceiveInstantBooking(baseInput),
    ).rejects.toMatchObject({
      response: {
        error: 'INSTANT_BOOKING_PRACTITIONER_NOT_AVAILABLE_NOW',
      },
    });
  });
});
