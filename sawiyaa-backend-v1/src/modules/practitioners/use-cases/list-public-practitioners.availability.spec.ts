import { ListPublicPractitionersUseCase } from './list-public-practitioners.use-case';

describe('ListPublicPractitionersUseCase availability semantics', () => {
  const makeUseCase = (prisma: unknown) =>
    new ListPublicPractitionersUseCase(
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      undefined,
      prisma as never,
    );

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-09-17T10:00:00.000Z'));
  });

  afterEach(() => jest.useRealTimers());

  it('requires a future concrete window for availableToday', async () => {
    const prisma = {
      practitionerAvailabilityWeek: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'week-1',
            practitionerId: 'p1',
            weekStartDate: new Date('2026-09-13T00:00:00.000Z'),
            weekEndDate: new Date('2026-09-19T00:00:00.000Z'),
            timezone: 'UTC',
            status: 'PUBLISHED',
            slots: [
              {
                id: 'slot-1',
                weekday: 'THURSDAY',
                startMinuteOfDay: 12 * 60,
                endMinuteOfDay: 13 * 60,
                durationMinutes: 60,
                timezone: 'UTC',
              },
            ],
          },
        ]),
      },
      availabilityException: { findMany: jest.fn().mockResolvedValue([]) },
      session: { findMany: jest.fn().mockResolvedValue([]) },
    };

    const result = await (makeUseCase(prisma) as any).filterByAvailability(
      [
        { id: 'p1', user: { timezone: 'UTC' } },
      ],
      { availableToday: true },
    );

    expect(result.map((row: { id: string }) => row.id)).toEqual(['p1']);
  });

  it('excludes a week whose only window is blocked by an active exception', async () => {
    const prisma = {
      practitionerAvailabilityWeek: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'week-1',
            practitionerId: 'p1',
            weekStartDate: new Date('2026-09-13T00:00:00.000Z'),
            weekEndDate: new Date('2026-09-19T00:00:00.000Z'),
            timezone: 'UTC',
            status: 'PUBLISHED',
            slots: [
              {
                id: 'slot-1',
                weekday: 'THURSDAY',
                startMinuteOfDay: 12 * 60,
                endMinuteOfDay: 13 * 60,
                durationMinutes: 60,
                timezone: 'UTC',
              },
            ],
          },
        ]),
      },
      availabilityException: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'exception-1',
            practitionerId: 'p1',
            availabilityWeekId: 'week-1',
            type: 'BLOCK',
            startsAtUtc: new Date('2026-09-17T11:30:00.000Z'),
            endsAtUtc: new Date('2026-09-17T13:30:00.000Z'),
            isActive: true,
          },
        ]),
      },
      session: { findMany: jest.fn().mockResolvedValue([]) },
    };

    const result = await (makeUseCase(prisma) as any).filterByAvailability(
      [{ id: 'p1', user: { timezone: 'UTC' } }],
      { availableThisWeek: true },
    );

    expect(result).toEqual([]);
  });
});
