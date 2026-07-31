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

  it('returns exactly the current week plus four future weeks', () => {
    const result = service.getActiveWindow({
      timezone: 'Africa/Cairo',
      now: new Date('2026-06-24T10:00:00.000Z'),
    });

    expect(result.weeks).toHaveLength(5);
    expect(result.weeks.map((week) => week.startDateIso)).toEqual([
      '2026-06-21',
      '2026-06-28',
      '2026-07-05',
      '2026-07-12',
      '2026-07-19',
    ]);
    expect(result.activeRange).toEqual({
      startWeekDate: '2026-06-21',
      endWeekDate: '2026-07-25',
    });
  });

  it('moves the rolling window at the next Sunday without using server timezone', () => {
    const result = service.getActiveWindow({
      timezone: 'Pacific/Auckland',
      now: new Date('2026-06-27T00:00:00.000Z'),
    });
    const nextResult = service.getActiveWindow({
      timezone: 'Pacific/Auckland',
      now: new Date('2026-06-28T00:00:00.000Z'),
    });

    expect(result.weeks[0].startDateIso).toBe('2026-06-21');
    expect(nextResult.weeks[0].startDateIso).toBe('2026-06-28');
    expect(nextResult.weeks[4].startDateIso).toBe('2026-07-26');
  });

  it('rejects a week outside the active rolling window', () => {
    expect(() =>
      service.assertWeekInsideActiveWindow({
        timezone: 'Africa/Cairo',
        weekStartDate: '2026-07-26',
        now: new Date('2026-06-24T10:00:00.000Z'),
      }),
    ).toThrow('Bad Request');
  });

});
