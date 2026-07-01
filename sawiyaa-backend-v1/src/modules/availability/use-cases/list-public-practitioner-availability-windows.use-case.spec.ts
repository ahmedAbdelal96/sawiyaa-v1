import { SessionStatus, AvailabilityWeekStatus, AvailabilityWeekday } from '@prisma/client';
import { ListPublicPractitionerAvailabilityWindowsUseCase } from './list-public-practitioner-availability-windows.use-case';

describe('ListPublicPractitionerAvailabilityWindowsUseCase', () => {
  const availabilityPractitionerRepository = {
    findByPublicSlug: jest.fn(),
  };
  const practitionerAvailabilityWeekRepository = {
    findPublishedByPractitionerAndWeekStarts: jest.fn(),
  };
  const availabilityExceptionRepository = {
    listActiveForRange: jest.fn(),
  };
  const resolvePractitionerTimezoneService = {
    resolve: jest.fn().mockReturnValue('UTC'),
  };
  const availabilityWeekCalendarService = {
    resolveCurrentAndNextWeekWindow: jest.fn(),
  };
  const buildPublishedWeekAvailabilityWindowsService = {
    buildForRange: jest.fn(),
  };
  const publicPractitionerVisibilityPolicy = {
    evaluate: jest.fn().mockReturnValue({ isVisible: true }),
  };
  const prisma = {
    session: {
      findMany: jest.fn(),
    },
  };

  const useCase = new ListPublicPractitionerAvailabilityWindowsUseCase(
    availabilityPractitionerRepository as any,
    practitionerAvailabilityWeekRepository as any,
    availabilityExceptionRepository as any,
    resolvePractitionerTimezoneService as any,
    availabilityWeekCalendarService as any,
    buildPublishedWeekAvailabilityWindowsService as any,
    publicPractitionerVisibilityPolicy as any,
    prisma as any,
  );

  const currentWeekStart = new Date('2026-06-21T00:00:00.000Z');
  const currentWeekEnd = new Date('2026-06-27T00:00:00.000Z');
  const nextWeekStart = new Date('2026-06-28T00:00:00.000Z');
  const nextWeekEnd = new Date('2026-07-04T00:00:00.000Z');

  const currentWeek = {
    id: 'week-current',
    weekStartDate: currentWeekStart,
    weekEndDate: currentWeekEnd,
    timezone: 'UTC',
    status: AvailabilityWeekStatus.PUBLISHED,
    slots: [
      {
        id: 'slot-current',
        weekday: AvailabilityWeekday.SUNDAY,
        startMinuteOfDay: 600,
        endMinuteOfDay: 720,
        durationMinutes: 30,
        timezone: 'UTC',
      },
    ],
  };

  const nextWeek = {
    id: 'week-next',
    weekStartDate: nextWeekStart,
    weekEndDate: nextWeekEnd,
    timezone: 'UTC',
    status: AvailabilityWeekStatus.PUBLISHED,
    slots: [
      {
        id: 'slot-next',
        weekday: AvailabilityWeekday.SUNDAY,
        startMinuteOfDay: 660,
        endMinuteOfDay: 780,
        durationMinutes: 30,
        timezone: 'UTC',
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    availabilityWeekCalendarService.resolveCurrentAndNextWeekWindow.mockReturnValue({
      currentWeek: {
        startDate: currentWeekStart,
        endDate: currentWeekEnd,
        startDateIso: '2026-06-21',
        endDateIso: '2026-06-27',
      },
      nextWeek: {
        startDate: nextWeekStart,
        endDate: nextWeekEnd,
        startDateIso: '2026-06-28',
        endDateIso: '2026-07-04',
      },
    });
  });

  it('builds public windows from published current and next weeks only', async () => {
    availabilityPractitionerRepository.findByPublicSlug.mockResolvedValue({
      id: 'practitioner-1',
      status: 'APPROVED',
      user: {
        status: 'ACTIVE',
        displayName: 'Dr. Example',
        timezone: 'UTC',
      },
      isPublicProfilePublished: true,
      publicSlug: 'dr-example',
      professionalTitle: 'Therapist',
      bio: 'Bio',
      specialties: [{ id: 'spec-1' }],
    });
    practitionerAvailabilityWeekRepository.findPublishedByPractitionerAndWeekStarts.mockResolvedValue([
      currentWeek,
      nextWeek,
    ]);
    availabilityExceptionRepository.listActiveForRange.mockResolvedValue([]);
    prisma.session.findMany.mockResolvedValue([
      {
        scheduledStartAt: new Date('2026-06-21T08:00:00.000Z'),
        scheduledEndAt: new Date('2026-06-21T08:30:00.000Z'),
        durationMinutes: 30,
        status: SessionStatus.CONFIRMED,
      },
    ]);
    buildPublishedWeekAvailabilityWindowsService.buildForRange.mockReturnValue([
      {
        startsAt: '2026-06-21T10:00:00.000Z',
        endsAt: '2026-06-21T12:00:00.000Z',
        durationMinutes: 30,
      },
      {
        startsAt: '2026-06-28T11:00:00.000Z',
        endsAt: '2026-06-28T13:00:00.000Z',
        durationMinutes: 30,
      },
    ]);

    const result = await useCase.execute({
      slug: 'dr-example',
      fromUtc: new Date('2026-06-20T00:00:00.000Z'),
      toUtc: new Date('2026-07-10T00:00:00.000Z'),
      includeBooked: true,
    });

    expect(availabilityWeekCalendarService.resolveCurrentAndNextWeekWindow).toHaveBeenCalledWith({
      timezone: 'UTC',
    });
    expect(
      practitionerAvailabilityWeekRepository.findPublishedByPractitionerAndWeekStarts,
    ).toHaveBeenCalledWith('practitioner-1', [currentWeekStart, nextWeekStart]);
    expect(availabilityExceptionRepository.listActiveForRange).toHaveBeenCalledWith(
      'practitioner-1',
      currentWeekStart,
      nextWeekEnd,
    );
    expect(prisma.session.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          practitionerId: 'practitioner-1',
          scheduledStartAt: {
            lt: nextWeekEnd,
          },
          scheduledEndAt: {
            gt: currentWeekStart,
          },
        }),
      }),
    );
    expect(buildPublishedWeekAvailabilityWindowsService.buildForRange).toHaveBeenCalledWith(
      expect.objectContaining({
        timezone: 'UTC',
        weeks: [currentWeek, nextWeek],
        exceptions: [],
        bookedSessions: [
          {
            startsAt: new Date('2026-06-21T08:00:00.000Z'),
            endsAt: new Date('2026-06-21T08:30:00.000Z'),
          },
        ],
        fromUtc: currentWeekStart,
        toUtc: nextWeekEnd,
      }),
    );
    expect(result).toEqual({
      timezone: 'UTC',
      range: {
        from: '2026-06-20T00:00:00.000Z',
        to: '2026-07-10T00:00:00.000Z',
      },
      windows: [
        {
          startsAt: '2026-06-21T10:00:00.000Z',
          endsAt: '2026-06-21T12:00:00.000Z',
          durationMinutes: 30,
        },
        {
          startsAt: '2026-06-28T11:00:00.000Z',
          endsAt: '2026-06-28T13:00:00.000Z',
          durationMinutes: 30,
        },
      ],
      bookedSlots: [
        {
          startsAt: '2026-06-21T08:00:00.000Z',
          endsAt: '2026-06-21T08:30:00.000Z',
          durationMinutes: 30,
          statusType: 'BOOKED',
        },
      ],
    });
  });

  it('returns an empty public window list when no published current or next week exists', async () => {
    availabilityPractitionerRepository.findByPublicSlug.mockResolvedValue({
      id: 'practitioner-1',
      status: 'APPROVED',
      user: {
        status: 'ACTIVE',
        displayName: 'Dr. Example',
        timezone: 'UTC',
      },
      isPublicProfilePublished: true,
      publicSlug: 'dr-example',
      professionalTitle: 'Therapist',
      bio: 'Bio',
      specialties: [{ id: 'spec-1' }],
    });
    practitionerAvailabilityWeekRepository.findPublishedByPractitionerAndWeekStarts.mockResolvedValue([]);
    availabilityExceptionRepository.listActiveForRange.mockResolvedValue([]);
    prisma.session.findMany.mockResolvedValue([]);
    buildPublishedWeekAvailabilityWindowsService.buildForRange.mockReturnValue([]);

    const result = await useCase.execute({
      slug: 'dr-example',
      fromUtc: new Date('2026-06-20T00:00:00.000Z'),
      toUtc: new Date('2026-07-10T00:00:00.000Z'),
    });

    expect(result.windows).toEqual([]);
    expect(result.bookedSlots).toBeUndefined();
  });
});
