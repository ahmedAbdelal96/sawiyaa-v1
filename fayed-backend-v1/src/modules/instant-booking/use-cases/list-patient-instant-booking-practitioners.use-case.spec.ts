import { PresenceStatus, PractitionerStatus, UserStatus } from '@prisma/client';
import { ListPatientInstantBookingPractitionersUseCase } from './list-patient-instant-booking-practitioners.use-case';

describe('ListPatientInstantBookingPractitionersUseCase', () => {
  const referenceTime = new Date('2026-05-07T12:00:00.000Z');
  const instantBookingPractitionerRepository = {
    listEligibleDiscoveryCandidates: jest.fn(),
  } as never;
  const availabilitySlotRepository = {
    listActiveByPractitioners: jest.fn(),
  } as never;
  const availabilityExceptionRepository = {
    listActiveForPractitionersBetween: jest.fn(),
  } as never;
  const sessionRepository = {
    listBlockingSessionsInRangeForPractitioners: jest.fn(),
    countCompletedSessionsByPractitioners: jest.fn(),
  } as never;
  const resolvePractitionerTimezoneService = {
    resolve: jest.fn(),
  } as never;
  const buildAvailabilityWindowsService = {
    buildForRange: jest.fn(),
  } as never;
  const publicPractitionerVisibilityPolicy = {
    evaluate: jest.fn(),
  } as never;

  const useCase = new ListPatientInstantBookingPractitionersUseCase(
    instantBookingPractitionerRepository,
    availabilitySlotRepository,
    availabilityExceptionRepository,
    sessionRepository,
    resolvePractitionerTimezoneService,
    buildAvailabilityWindowsService,
    publicPractitionerVisibilityPolicy,
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
      lastSeenAtUtc: new Date('2026-05-07T11:59:30.000Z'),
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

  beforeAll(() => {
    jest.useFakeTimers();
  });

  beforeEach(() => {
    jest.setSystemTime(referenceTime);
    jest.clearAllMocks();
    (publicPractitionerVisibilityPolicy.evaluate as jest.Mock).mockReturnValue({
      isVisible: true,
      isVerified: true,
    });
    (
      instantBookingPractitionerRepository.listEligibleDiscoveryCandidates as jest.Mock
    ).mockResolvedValue([baseCandidate]);
    (
      availabilitySlotRepository.listActiveByPractitioners as jest.Mock
    ).mockResolvedValue([{ practitionerId: 'practitioner-1' }]);
    (
      availabilityExceptionRepository.listActiveForPractitionersBetween as jest.Mock
    ).mockResolvedValue([]);
    (
      sessionRepository.listBlockingSessionsInRangeForPractitioners as jest.Mock
    ).mockResolvedValue([]);
    (
      sessionRepository.countCompletedSessionsByPractitioners as jest.Mock
    ).mockResolvedValue(new Map([['practitioner-1', 12]]));
    (resolvePractitionerTimezoneService.resolve as jest.Mock).mockReturnValue(
      'Africa/Cairo',
    );
    (buildAvailabilityWindowsService.buildForRange as jest.Mock).mockReturnValue([
      {
        startsAt: '2026-05-07T12:00:00.000Z',
        endsAt: '2026-05-07T13:30:00.000Z',
      },
    ]);
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('returns eligible practitioners with backend-owned instant prices', async () => {
    const result = await useCase.execute({
      locale: 'ar',
      page: 1,
      limit: 20,
    });

    expect(result.meta).toMatchObject({
      page: 1,
      limit: 20,
      total: 1,
      hasMore: false,
    });
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      practitionerId: 'practitioner-1',
      slug: 'dr-salma',
      displayName: 'Dr. Salma',
      availableNow: true,
      instantBookingEnabled: true,
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
      completedSessionsCount: 12,
    });
    expect(resolvePractitionerTimezoneService.resolve).toHaveBeenCalledWith({
      weeklySlots: [{ practitionerId: 'practitioner-1' }],
      fallbackTimezone: 'Africa/Cairo',
    });
  });

  it('filters to a single supported duration when only 30 minutes fits now', async () => {
    (
      buildAvailabilityWindowsService.buildForRange as jest.Mock
    ).mockReturnValue([
      {
        startsAt: '2026-05-07T12:00:00.000Z',
        endsAt: '2026-05-07T12:30:00.000Z',
      },
    ]);

    const result = await useCase.execute({
      locale: 'ar',
      duration: 30,
      currency: 'EGP',
      page: 1,
      limit: 20,
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0].supportedDurations).toEqual([30]);
    expect(result.items[0].instantBookingPricing).toEqual({
      EGP: {
        30: '520.00',
      },
    });
  });

  it('excludes practitioners without a live window, online presence, or usable price', async () => {
    (publicPractitionerVisibilityPolicy.evaluate as jest.Mock)
      .mockReturnValueOnce({ isVisible: true, isVerified: true })
      .mockReturnValueOnce({ isVisible: true, isVerified: true })
      .mockReturnValueOnce({ isVisible: true, isVerified: true });

    (
      instantBookingPractitionerRepository.listEligibleDiscoveryCandidates as jest.Mock
    ).mockResolvedValue([
      baseCandidate,
      {
        ...baseCandidate,
        id: 'offline',
        publicSlug: 'offline',
        presence: {
          ...baseCandidate.presence,
          status: PresenceStatus.OFFLINE,
          lastSeenAtUtc: new Date('2026-05-07T11:59:30.000Z'),
        },
      },
      {
        ...baseCandidate,
        id: 'no-price',
        publicSlug: 'no-price',
        instantBookingPrice30Egp: null,
        instantBookingPrice30Usd: null,
        instantBookingPrice60Egp: null,
        instantBookingPrice60Usd: null,
      },
    ]);

    (
      buildAvailabilityWindowsService.buildForRange as jest.Mock
    ).mockReturnValueOnce([
      {
        startsAt: '2026-05-07T12:00:00.000Z',
        endsAt: '2026-05-07T12:30:00.000Z',
      },
    ]).mockReturnValueOnce([]).mockReturnValueOnce([
      {
        startsAt: '2026-05-07T12:00:00.000Z',
        endsAt: '2026-05-07T12:30:00.000Z',
      },
    ]);

    const result = await useCase.execute({
      locale: 'ar',
      page: 1,
      limit: 20,
    });

    expect(result.items.map((item) => item.practitionerId)).toEqual([
      'practitioner-1',
    ]);
  });

  it('rejects zero or invalid prices by excluding them from discovery', async () => {
    (
      instantBookingPractitionerRepository.listEligibleDiscoveryCandidates as jest.Mock
    ).mockResolvedValue([
      {
        ...baseCandidate,
        id: 'zero-price',
        publicSlug: 'zero-price',
        instantBookingPrice30Egp: '0.00',
        instantBookingPrice30Usd: '0.00',
        instantBookingPrice60Egp: '0.00',
        instantBookingPrice60Usd: '0.00',
      },
    ]);

    const result = await useCase.execute({
      locale: 'ar',
      page: 1,
      limit: 20,
    });

    expect(result.items).toHaveLength(0);
  });

  it('drops practitioners whose live window is blocked by conflicting sessions', async () => {
    (
      sessionRepository.listBlockingSessionsInRangeForPractitioners as jest.Mock
    ).mockResolvedValue([
      {
        practitionerId: 'practitioner-1',
        scheduledStartAt: new Date('2026-05-07T12:05:00.000Z'),
        scheduledEndAt: new Date('2026-05-07T12:25:00.000Z'),
      },
    ]);
    (
      buildAvailabilityWindowsService.buildForRange as jest.Mock
    ).mockReturnValue([]);

    const result = await useCase.execute({
      locale: 'ar',
      page: 1,
      limit: 20,
    });

    expect(
      sessionRepository.listBlockingSessionsInRangeForPractitioners,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        practitionerIds: ['practitioner-1'],
      }),
    );
    expect(result.items).toHaveLength(0);
  });
});
