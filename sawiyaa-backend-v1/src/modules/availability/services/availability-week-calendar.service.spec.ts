import { BadRequestException } from '@nestjs/common';
import { AvailabilityWeekCalendarService } from './availability-week-calendar.service';

describe('AvailabilityWeekCalendarService', () => {
  const service = new AvailabilityWeekCalendarService();

  it('resolves current and next Sunday-based week windows in the practitioner timezone', () => {
    const result = service.resolveCurrentAndNextWeekWindow({
      timezone: 'Africa/Cairo',
      now: new Date('2026-06-24T10:00:00.000Z'),
    });

    expect(result.currentWeek).toEqual({
      startDate: new Date('2026-06-21T00:00:00.000Z'),
      endDate: new Date('2026-06-27T00:00:00.000Z'),
      startDateIso: '2026-06-21',
      endDateIso: '2026-06-27',
    });
    expect(result.nextWeek).toEqual({
      startDate: new Date('2026-06-28T00:00:00.000Z'),
      endDate: new Date('2026-07-04T00:00:00.000Z'),
      startDateIso: '2026-06-28',
      endDateIso: '2026-07-04',
    });
  });

  it('rejects a week start date that is not Sunday', () => {
    expect(() =>
      service.resolveWeekWindowFromStartDate({
        weekStartDate: '2026-06-22',
      }),
    ).toThrow(BadRequestException);
  });
});
