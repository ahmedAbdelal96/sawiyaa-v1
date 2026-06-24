import {
  AvailabilityExceptionSource,
  AvailabilityExceptionType,
  AvailabilityWeekday,
} from '@prisma/client';
import { BuildAvailabilityWindowsService } from './build-availability-windows.service';

describe('BuildAvailabilityWindowsService', () => {
  const service = new BuildAvailabilityWindowsService();

  it.each([
    [
      'Africa/Cairo',
      '2026-04-05T08:00:00.000Z',
      '2026-04-05T09:00:00.000Z',
    ],
    [
      'Asia/Riyadh',
      '2026-04-05T07:00:00.000Z',
      '2026-04-05T08:00:00.000Z',
    ],
    [
      'Asia/Dubai',
      '2026-04-05T06:00:00.000Z',
      '2026-04-05T07:00:00.000Z',
    ],
  ])(
    'expands weekly recurrence in %s using practitioner-local wall time',
    (timezone, startsAt, endsAt) => {
      const windows = service.buildForRange({
        timezone,
        fromUtc: new Date('2026-04-05T00:00:00.000Z'),
        toUtc: new Date('2026-04-06T00:00:00.000Z'),
        weeklySlots: [
          {
            id: 'slot-1',
            practitionerId: 'practitioner-1',
            weekday: AvailabilityWeekday.SUNDAY,
            durationMinutes: 60,
            startMinuteOfDay: 600,
            endMinuteOfDay: 660,
            timezone,
            isActive: true,
            effectiveFrom: null,
            effectiveTo: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        exceptions: [],
      });

      expect(windows).toEqual([
        {
          startsAt,
          endsAt,
          durationMinutes: 60,
        },
      ]);
    },
  );

  it('keeps a local midnight window on the previous UTC day in an east-of-UTC timezone', () => {
    const windows = service.buildForRange({
      timezone: 'Asia/Riyadh',
      fromUtc: new Date('2026-04-04T20:00:00.000Z'),
      toUtc: new Date('2026-04-05T03:00:00.000Z'),
      weeklySlots: [
        {
          id: 'slot-midnight',
          practitionerId: 'practitioner-1',
          weekday: AvailabilityWeekday.SUNDAY,
          durationMinutes: 30,
          startMinuteOfDay: 30,
          endMinuteOfDay: 60,
          timezone: 'Asia/Riyadh',
          isActive: true,
          effectiveFrom: null,
          effectiveTo: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      exceptions: [],
    });

    expect(windows).toEqual([
      {
        startsAt: '2026-04-04T21:30:00.000Z',
        endsAt: '2026-04-04T22:00:00.000Z',
        durationMinutes: 30,
      },
    ]);
  });

  it('applies OPEN_EXTRA and BLOCK exceptions over recurring weekly schedule', () => {
    const windows = service.buildForRange({
      timezone: 'UTC',
      fromUtc: new Date('2026-04-05T00:00:00.000Z'),
      toUtc: new Date('2026-04-06T00:00:00.000Z'),
      weeklySlots: [
        {
          id: 'slot-1',
          practitionerId: 'practitioner-1',
          weekday: AvailabilityWeekday.SUNDAY,
          durationMinutes: 30,
          startMinuteOfDay: 600,
          endMinuteOfDay: 630,
          timezone: 'UTC',
          isActive: true,
          effectiveFrom: null,
          effectiveTo: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'slot-2',
          practitionerId: 'practitioner-1',
          weekday: AvailabilityWeekday.SUNDAY,
          durationMinutes: 30,
          startMinuteOfDay: 630,
          endMinuteOfDay: 660,
          timezone: 'UTC',
          isActive: true,
          effectiveFrom: null,
          effectiveTo: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'slot-3',
          practitionerId: 'practitioner-1',
          weekday: AvailabilityWeekday.SUNDAY,
          durationMinutes: 30,
          startMinuteOfDay: 660,
          endMinuteOfDay: 690,
          timezone: 'UTC',
          isActive: true,
          effectiveFrom: null,
          effectiveTo: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'slot-4',
          practitionerId: 'practitioner-1',
          weekday: AvailabilityWeekday.SUNDAY,
          durationMinutes: 30,
          startMinuteOfDay: 690,
          endMinuteOfDay: 720,
          timezone: 'UTC',
          isActive: true,
          effectiveFrom: null,
          effectiveTo: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      exceptions: [
        {
          id: 'block-1',
          practitionerId: 'practitioner-1',
          type: AvailabilityExceptionType.BLOCK,
          startsAtUtc: new Date('2026-04-05T10:30:00.000Z'),
          endsAtUtc: new Date('2026-04-05T11:00:00.000Z'),
          reason: null,
          source: AvailabilityExceptionSource.MANUAL,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'open-1',
          practitionerId: 'practitioner-1',
          type: AvailabilityExceptionType.OPEN_EXTRA,
          startsAtUtc: new Date('2026-04-05T14:00:00.000Z'),
          endsAtUtc: new Date('2026-04-05T15:00:00.000Z'),
          reason: null,
          source: AvailabilityExceptionSource.MANUAL,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    });

    expect(windows).toEqual([
      {
        startsAt: '2026-04-05T10:00:00.000Z',
        endsAt: '2026-04-05T10:30:00.000Z',
        durationMinutes: 30,
      },
      {
        startsAt: '2026-04-05T11:00:00.000Z',
        endsAt: '2026-04-05T12:00:00.000Z',
        durationMinutes: 30,
      },
      {
        startsAt: '2026-04-05T14:00:00.000Z',
        endsAt: '2026-04-05T15:00:00.000Z',
        durationMinutes: null,
      },
    ]);
  });

  it('removes booked sessions from patient-visible availability windows', () => {
    const windows = service.buildForRange({
      timezone: 'UTC',
      fromUtc: new Date('2026-04-05T00:00:00.000Z'),
      toUtc: new Date('2026-04-06T00:00:00.000Z'),
      weeklySlots: [
        {
          id: 'slot-1',
          practitionerId: 'practitioner-1',
          weekday: AvailabilityWeekday.SUNDAY,
          durationMinutes: 30,
          startMinuteOfDay: 600,
          endMinuteOfDay: 720,
          timezone: 'UTC',
          isActive: true,
          effectiveFrom: null,
          effectiveTo: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      exceptions: [],
      bookedSessions: [
        {
          startsAt: new Date('2026-04-05T10:30:00.000Z'),
          endsAt: new Date('2026-04-05T11:00:00.000Z'),
        },
      ],
    });

    expect(windows).toEqual([
      {
        startsAt: '2026-04-05T10:00:00.000Z',
        endsAt: '2026-04-05T10:30:00.000Z',
        durationMinutes: 30,
      },
      {
        startsAt: '2026-04-05T11:00:00.000Z',
        endsAt: '2026-04-05T12:00:00.000Z',
        durationMinutes: 30,
      },
    ]);
  });

  it('keeps adjacent windows intact when a booked session ends exactly at the boundary', () => {
    const windows = service.buildForRange({
      timezone: 'UTC',
      fromUtc: new Date('2026-04-05T00:00:00.000Z'),
      toUtc: new Date('2026-04-06T00:00:00.000Z'),
      weeklySlots: [
        {
          id: 'slot-1',
          practitionerId: 'practitioner-1',
          weekday: AvailabilityWeekday.SUNDAY,
          durationMinutes: 30,
          startMinuteOfDay: 630,
          endMinuteOfDay: 660,
          timezone: 'UTC',
          isActive: true,
          effectiveFrom: null,
          effectiveTo: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      exceptions: [],
      bookedSessions: [
        {
          startsAt: new Date('2026-04-05T10:00:00.000Z'),
          endsAt: new Date('2026-04-05T10:30:00.000Z'),
        },
      ],
    });

    expect(windows).toEqual([
      {
        startsAt: '2026-04-05T10:30:00.000Z',
        endsAt: '2026-04-05T11:00:00.000Z',
        durationMinutes: 30,
      },
    ]);
  });
});
