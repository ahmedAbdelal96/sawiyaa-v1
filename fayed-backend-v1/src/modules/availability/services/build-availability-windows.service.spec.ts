import {
  AvailabilityExceptionSource,
  AvailabilityExceptionType,
  AvailabilityWeekday,
} from '@prisma/client';
import { BuildAvailabilityWindowsService } from './build-availability-windows.service';

describe('BuildAvailabilityWindowsService', () => {
  const service = new BuildAvailabilityWindowsService();

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
      },
      {
        startsAt: '2026-04-05T11:00:00.000Z',
        endsAt: '2026-04-05T12:00:00.000Z',
      },
      {
        startsAt: '2026-04-05T14:00:00.000Z',
        endsAt: '2026-04-05T15:00:00.000Z',
      },
    ]);
  });
});
