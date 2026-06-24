import {
  AvailabilityExceptionSource,
  AvailabilityExceptionType,
  AvailabilityWeekStatus,
  AvailabilityWeekday,
} from '@prisma/client';
import { BuildPublishedWeekAvailabilityWindowsService } from './build-published-week-availability-windows.service';

describe('BuildPublishedWeekAvailabilityWindowsService', () => {
  const service = new BuildPublishedWeekAvailabilityWindowsService();

  const currentWeek = {
    id: 'week-current',
    weekStartDate: new Date('2026-06-21T00:00:00.000Z'),
    weekEndDate: new Date('2026-06-27T00:00:00.000Z'),
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
    weekStartDate: new Date('2026-06-28T00:00:00.000Z'),
    weekEndDate: new Date('2026-07-04T00:00:00.000Z'),
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

  it('builds patient-visible windows from published current and next week plans only', () => {
    const windows = service.buildForRange({
      timezone: 'UTC',
      fromUtc: new Date('2026-06-21T00:00:00.000Z'),
      toUtc: new Date('2026-07-05T00:00:00.000Z'),
      now: new Date('2026-06-20T00:00:00.000Z'),
      weeks: [currentWeek, nextWeek],
      exceptions: [],
    });

    expect(windows).toEqual([
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
  });

  it('ignores draft and archived week inputs', () => {
    const windows = service.buildForRange({
      timezone: 'UTC',
      fromUtc: new Date('2026-06-21T00:00:00.000Z'),
      toUtc: new Date('2026-07-05T00:00:00.000Z'),
      now: new Date('2026-06-20T00:00:00.000Z'),
      weeks: [
        currentWeek,
        {
          ...nextWeek,
          id: 'week-draft',
          status: AvailabilityWeekStatus.DRAFT,
          slots: [
            {
              ...nextWeek.slots[0],
              id: 'slot-draft',
            },
          ],
        },
        {
          ...nextWeek,
          id: 'week-archived',
          weekStartDate: new Date('2026-07-05T00:00:00.000Z'),
          weekEndDate: new Date('2026-07-11T00:00:00.000Z'),
          status: AvailabilityWeekStatus.ARCHIVED,
          slots: [
            {
              ...nextWeek.slots[0],
              id: 'slot-archived',
              startMinuteOfDay: 840,
              endMinuteOfDay: 900,
            },
          ],
        },
      ],
      exceptions: [],
    });

    expect(windows).toEqual([
      {
        startsAt: '2026-06-21T10:00:00.000Z',
        endsAt: '2026-06-21T12:00:00.000Z',
        durationMinutes: 30,
      },
    ]);
  });

  it('applies BLOCK and OPEN_EXTRA exceptions and subtracts booked sessions', () => {
    const windows = service.buildForRange({
      timezone: 'UTC',
      fromUtc: new Date('2026-06-21T00:00:00.000Z'),
      toUtc: new Date('2026-06-22T00:00:00.000Z'),
      now: new Date('2026-06-20T00:00:00.000Z'),
      weeks: [
        {
          ...currentWeek,
          slots: [
            {
              id: 'slot-base',
              weekday: AvailabilityWeekday.SUNDAY,
              startMinuteOfDay: 600,
              endMinuteOfDay: 720,
              durationMinutes: 30,
              timezone: 'UTC',
            },
          ],
        },
      ],
      exceptions: [
        {
          id: 'exception-block',
          practitionerId: 'practitioner-1',
          availabilityWeekId: 'week-current',
          type: AvailabilityExceptionType.BLOCK,
          startsAtUtc: new Date('2026-06-21T10:30:00.000Z'),
          endsAtUtc: new Date('2026-06-21T11:00:00.000Z'),
          reason: null,
          source: AvailabilityExceptionSource.MANUAL,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'exception-open',
          practitionerId: 'practitioner-1',
          availabilityWeekId: 'week-current',
          type: AvailabilityExceptionType.OPEN_EXTRA,
          startsAtUtc: new Date('2026-06-21T14:00:00.000Z'),
          endsAtUtc: new Date('2026-06-21T15:00:00.000Z'),
          reason: null,
          source: AvailabilityExceptionSource.MANUAL,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      bookedSessions: [
        {
          startsAt: new Date('2026-06-21T11:30:00.000Z'),
          endsAt: new Date('2026-06-21T12:00:00.000Z'),
        },
      ],
    });

    expect(windows).toEqual([
      {
        startsAt: '2026-06-21T10:00:00.000Z',
        endsAt: '2026-06-21T10:30:00.000Z',
        durationMinutes: 30,
      },
      {
        startsAt: '2026-06-21T11:00:00.000Z',
        endsAt: '2026-06-21T11:30:00.000Z',
        durationMinutes: 30,
      },
      {
        startsAt: '2026-06-21T14:00:00.000Z',
        endsAt: '2026-06-21T15:00:00.000Z',
        durationMinutes: null,
      },
    ]);
  });

  it('returns an empty list when no published week exists', () => {
    const windows = service.buildForRange({
      timezone: 'UTC',
      fromUtc: new Date('2026-06-21T00:00:00.000Z'),
      toUtc: new Date('2026-06-22T00:00:00.000Z'),
      now: new Date('2026-06-20T00:00:00.000Z'),
      weeks: [
        {
          ...currentWeek,
          id: 'week-draft-only',
          status: AvailabilityWeekStatus.DRAFT,
        },
      ],
      exceptions: [],
    });

    expect(windows).toEqual([]);
  });
});
