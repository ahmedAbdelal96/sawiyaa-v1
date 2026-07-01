import {
  AvailabilityExceptionSource,
  AvailabilityExceptionType,
  AvailabilityWeekStatus,
  AvailabilityWeekday,
  PresenceStatus,
  PractitionerStatus,
  UserStatus,
} from '@prisma/client';
import { AvailabilityWeekCalendarService } from '@modules/availability/services/availability-week-calendar.service';
import { BuildPublishedWeekAvailabilityWindowsService } from '@modules/availability/services/build-published-week-availability-windows.service';
import { ResolvePractitionerTimezoneService } from '@modules/availability/services/resolve-practitioner-timezone.service';
import { ListPatientInstantBookingPractitionersUseCase } from './list-patient-instant-booking-practitioners.use-case';

describe('ListPatientInstantBookingPractitionersUseCase', () => {
  const referenceTime = new Date('2026-06-25T12:00:00.000Z');
  const currentWeekStart = new Date('2026-06-21T00:00:00.000Z');
  const currentWeekEnd = new Date('2026-06-27T00:00:00.000Z');
  const nextWeekStart = new Date('2026-06-28T00:00:00.000Z');
  const nextWeekEnd = new Date('2026-07-04T00:00:00.000Z');

  const instantBookingPractitionerRepository = {
    listEligibleDiscoveryCandidates: jest.fn(),
  } as never;
  const practitionerAvailabilityWeekRepository = {
    findPublishedByPractitionerAndWeekStarts: jest.fn(),
  } as never;
  const availabilityExceptionRepository = {
    listActiveForRange: jest.fn(),
  } as never;
  const sessionRepository = {
    listBlockingSessionRangesInRangeForPractitioner: jest.fn(),
    countCompletedSessionsByPractitioners: jest.fn(),
  } as never;
  const resolvePractitionerTimezoneService =
    new ResolvePractitionerTimezoneService();
  const availabilityWeekCalendarService =
    new AvailabilityWeekCalendarService();
  const buildPublishedWeekAvailabilityWindowsService =
    new BuildPublishedWeekAvailabilityWindowsService();
  const publicPractitionerVisibilityPolicy = {
    evaluate: jest.fn(),
  } as never;
  const sessionReviewRatingAggregationService = {
    aggregateByPractitionerIds: jest.fn(),
  } as never;

  const useCase = new ListPatientInstantBookingPractitionersUseCase(
    instantBookingPractitionerRepository,
    practitionerAvailabilityWeekRepository,
    availabilityExceptionRepository,
    sessionRepository,
    resolvePractitionerTimezoneService,
    availabilityWeekCalendarService,
    buildPublishedWeekAvailabilityWindowsService,
    publicPractitionerVisibilityPolicy,
    sessionReviewRatingAggregationService,
  );

  const resolveTimezoneSpy = jest.spyOn(
    resolvePractitionerTimezoneService,
    'resolve',
  );
  const resolveWeekWindowSpy = jest.spyOn(
    availabilityWeekCalendarService,
    'resolveCurrentAndNextWeekWindow',
  );
  const buildWindowsSpy = jest.spyOn(
    buildPublishedWeekAvailabilityWindowsService,
    'buildForRange',
  );

  const baseCandidate = {
    id: 'practitioner-1',
    publicSlug: 'dr-salma',
    status: PractitionerStatus.APPROVED,
    isPublicProfilePublished: true,
    professionalTitle: 'Therapist',
    bio: 'A warm and experienced therapist with instant booking availability.',
    avatarUrl: 'https://example.com/avatar.jpg',
    yearsOfExperience: 8,
    instantBookingPrice30Egp: '520.00',
    instantBookingPrice30Usd: '31.00',
    instantBookingPrice60Egp: '940.00',
    instantBookingPrice60Usd: '56.00',
    user: {
      id: 'user-1',
      displayName: 'Dr. Salma',
      status: UserStatus.ACTIVE,
      timezone: 'Africa/Cairo',
    },
    presence: {
      status: PresenceStatus.ONLINE,
      lastSeenAtUtc: new Date('2026-06-25T11:59:30.000Z'),
      isInstantBookingEnabled: true,
    },
    specialties: [
      {
        isPrimary: true,
        specialty: {
          slug: 'anxiety',
          translations: [
            { locale: 'ar', title: 'القلق' },
            { locale: 'en', title: 'Anxiety' },
          ],
        },
      },
    ],
    ratingSummary: {
      averageRating: '4.8',
      publishedReviewsCount: 45,
    },
  } as never;

  const currentWeek = {
    id: 'week-current',
    weekStartDate: currentWeekStart,
    weekEndDate: currentWeekEnd,
    timezone: 'Africa/Cairo',
    status: AvailabilityWeekStatus.PUBLISHED,
    slots: [
      {
        id: 'slot-current',
        weekday: AvailabilityWeekday.THURSDAY,
        startMinuteOfDay: 900,
        endMinuteOfDay: 960,
        durationMinutes: 60,
        timezone: 'Africa/Cairo',
      },
    ],
  };

  const nextWeek = {
    id: 'week-next',
    weekStartDate: nextWeekStart,
    weekEndDate: nextWeekEnd,
    timezone: 'Africa/Cairo',
    status: AvailabilityWeekStatus.PUBLISHED,
    slots: [
      {
        id: 'slot-next',
        weekday: AvailabilityWeekday.THURSDAY,
        startMinuteOfDay: 900,
        endMinuteOfDay: 960,
        durationMinutes: 60,
        timezone: 'Africa/Cairo',
      },
    ],
  };

  beforeAll(() => {
    jest.useFakeTimers();
  });

  beforeEach(() => {
    jest.setSystemTime(referenceTime);
    jest.clearAllMocks();
    resolveTimezoneSpy.mockClear();
    resolveWeekWindowSpy.mockClear();
    buildWindowsSpy.mockClear();

    (publicPractitionerVisibilityPolicy.evaluate as jest.Mock).mockReturnValue({
      isVisible: true,
      isVerified: true,
    });
    (
      instantBookingPractitionerRepository.listEligibleDiscoveryCandidates as jest.Mock
    ).mockResolvedValue([baseCandidate]);
    (
      sessionReviewRatingAggregationService.aggregateByPractitionerIds as jest.Mock
    ).mockResolvedValue(new Map([['practitioner-1', { averageRating: 4.8 }]]));
    (
      practitionerAvailabilityWeekRepository.findPublishedByPractitionerAndWeekStarts as jest.Mock
    ).mockResolvedValue([currentWeek, nextWeek]);
    (availabilityExceptionRepository.listActiveForRange as jest.Mock).mockResolvedValue([]);
    (
      sessionRepository.listBlockingSessionRangesInRangeForPractitioner as jest.Mock
    ).mockResolvedValue([]);
    (
      sessionRepository.countCompletedSessionsByPractitioners as jest.Mock
    ).mockResolvedValue(new Map([['practitioner-1', 12]]));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('returns eligible practitioners with published-week instant prices and unchanged response shape', async () => {
    const result = await useCase.execute({
      locale: 'ar',
      page: 1,
      limit: 20,
    });

    expect(resolveTimezoneSpy).toHaveBeenCalledWith({
      fallbackTimezone: 'Africa/Cairo',
    });
    expect(resolveWeekWindowSpy).toHaveBeenCalledWith({
      timezone: 'Africa/Cairo',
      now: referenceTime,
    });
    expect(
      practitionerAvailabilityWeekRepository.findPublishedByPractitionerAndWeekStarts,
    ).toHaveBeenCalledWith('practitioner-1', [
      currentWeekStart,
      nextWeekStart,
    ]);
    expect(availabilityExceptionRepository.listActiveForRange).toHaveBeenCalledWith(
      'practitioner-1',
      referenceTime,
      new Date('2026-06-26T12:00:00.000Z'),
    );
    expect(
      sessionRepository.listBlockingSessionRangesInRangeForPractitioner,
    ).toHaveBeenCalledWith(
      'practitioner-1',
      new Date('2026-06-26T12:00:00.000Z'),
      referenceTime,
      referenceTime,
    );
    expect(buildWindowsSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        timezone: 'Africa/Cairo',
        weeks: [currentWeek, nextWeek],
        exceptions: [],
        bookedSessions: [],
        fromUtc: referenceTime,
        toUtc: new Date('2026-06-26T12:00:00.000Z'),
        now: referenceTime,
      }),
    );
    expect(result).toEqual({
      items: [
        expect.objectContaining({
          practitionerId: 'practitioner-1',
          slug: 'dr-salma',
          displayName: 'Dr. Salma',
          avatarUrl: 'https://example.com/avatar.jpg',
          primarySpecialty: 'القلق',
          title: 'Therapist',
          isOnline: true,
          availableNow: true,
          instantBookingEnabled: true,
          earliestStartAt: referenceTime.toISOString(),
          currentWindowEndsAt: '2026-06-25T13:00:00.000Z',
          supportedDurations: [30, 60],
          instantBookingPricing: {
            EGP: {
              30: '520.00',
              60: '940.00',
            },
            USD: {
              30: '31.00',
              60: '56.00',
            },
          },
          shortBio: 'A warm and experienced therapist with instant booking availability.',
          rating: 4.8,
          completedSessionsCount: 12,
        }),
      ],
      meta: {
        page: 1,
        limit: 20,
        total: 1,
        hasMore: false,
        generatedAt: expect.any(String),
      },
    });
  });

  it.each([
    'no published week',
    'draft week only',
    'archived week only',
  ])('does not discover practitioners when there is %s', async () => {
    (
      practitionerAvailabilityWeekRepository.findPublishedByPractitionerAndWeekStarts as jest.Mock
    ).mockResolvedValueOnce([]);

    const result = await useCase.execute({
      locale: 'ar',
      page: 1,
      limit: 20,
    });

    expect(result).toEqual({
      items: [],
      meta: {
        page: 1,
        limit: 20,
        total: 0,
        hasMore: false,
        generatedAt: expect.any(String),
      },
    });
    expect(buildWindowsSpy).not.toHaveBeenCalled();
  });

  it('does not discover practitioners when legacy recurring slots exist but no published week is returned', async () => {
    (
      practitionerAvailabilityWeekRepository.findPublishedByPractitionerAndWeekStarts as jest.Mock
    ).mockResolvedValueOnce([]);

    const result = await useCase.execute({
      locale: 'ar',
      page: 1,
      limit: 20,
    });

    expect(result.items).toHaveLength(0);
    expect(result.meta.total).toBe(0);
  });

  it('does not discover practitioners when the published current week is fully blocked by an exception', async () => {
    (
      availabilityExceptionRepository.listActiveForRange as jest.Mock
    ).mockResolvedValueOnce([
      {
        id: 'exception-block',
        practitionerId: 'practitioner-1',
        availabilityWeekId: 'week-current',
        type: AvailabilityExceptionType.BLOCK,
        startsAtUtc: new Date('2026-06-25T12:00:00.000Z'),
        endsAtUtc: new Date('2026-06-25T13:00:00.000Z'),
        reason: null,
        source: AvailabilityExceptionSource.MANUAL,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ] as any);

    const result = await useCase.execute({
      locale: 'ar',
      page: 1,
      limit: 20,
    });

    expect(result.items).toHaveLength(0);
    expect(buildWindowsSpy).toHaveBeenCalled();
  });

  it('does not discover practitioners when the published current week is fully blocked by an existing session', async () => {
    (
      sessionRepository.listBlockingSessionRangesInRangeForPractitioner as jest.Mock
    ).mockResolvedValueOnce([
      {
        scheduledStartAt: new Date('2026-06-25T12:00:00.000Z'),
        scheduledEndAt: new Date('2026-06-25T13:00:00.000Z'),
      },
    ]);

    const result = await useCase.execute({
      locale: 'ar',
      page: 1,
      limit: 20,
    });

    expect(result.items).toHaveLength(0);
  });

  it('does not discover practitioners when only next week is published for the current instant', async () => {
    (
      practitionerAvailabilityWeekRepository.findPublishedByPractitionerAndWeekStarts as jest.Mock
    ).mockResolvedValueOnce([nextWeek]);

    const result = await useCase.execute({
      locale: 'ar',
      page: 1,
      limit: 20,
    });

    expect(result.items).toHaveLength(0);
    expect(practitionerAvailabilityWeekRepository.findPublishedByPractitionerAndWeekStarts).toHaveBeenCalledWith(
      'practitioner-1',
      [currentWeekStart, nextWeekStart],
    );
  });
});
