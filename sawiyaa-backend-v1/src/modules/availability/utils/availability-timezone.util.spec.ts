import {
  getCalendarDateParts,
  getWeekdayIndex,
  getZonedDateTimeParts,
  zonedDateTimeToUtc,
} from './availability-timezone.util';

describe('availability-timezone util', () => {
  it('derives local date parts in a DST-aware IANA timezone', () => {
    const parts = getZonedDateTimeParts(
      new Date('2026-06-01T10:15:30.000Z'),
      'Europe/Berlin',
    );

    expect(parts).toEqual({
      year: 2026,
      month: 6,
      day: 1,
      hour: 12,
      minute: 15,
      second: 30,
    });
  });

  it('derives weekday and calendar date from practitioner-local wall time across a UTC day boundary', () => {
    const parts = getCalendarDateParts(
      new Date('2026-06-01T23:30:00.000Z'),
      'Asia/Riyadh',
    );

    expect(parts).toEqual({
      year: 2026,
      month: 6,
      day: 2,
    });
    expect(getWeekdayIndex(parts)).toBe(2);
  });

  it('converts practitioner-local wall time to UTC even when the UTC day changes', () => {
    const result = zonedDateTimeToUtc(
      {
        year: 2026,
        month: 4,
        day: 5,
        hour: 0,
        minute: 30,
      },
      'Asia/Riyadh',
    );

    expect(result.toISOString()).toBe('2026-04-04T21:30:00.000Z');
  });
});
