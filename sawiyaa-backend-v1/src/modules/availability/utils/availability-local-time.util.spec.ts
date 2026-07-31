import { BadRequestException } from '@nestjs/common';
import { assertWeeklySlotsHaveValidLocalTimes } from './availability-local-time.util';

describe('availability local time validation', () => {
  const weekStartDate = new Date('2026-03-08T00:00:00.000Z');

  it('rejects a nonexistent spring-forward local time', () => {
    expect(() =>
      assertWeeklySlotsHaveValidLocalTimes({
        weekStartDate,
        timezone: 'America/New_York',
        slots: [
          {
            dayOfWeek: 0,
            startMinuteOfDay: 150,
            endMinuteOfDay: 180,
          },
        ],
      }),
    ).toThrow(BadRequestException);
  });

  it('accepts a nearby valid time on the spring-forward date', () => {
    expect(() =>
      assertWeeklySlotsHaveValidLocalTimes({
        weekStartDate,
        timezone: 'America/New_York',
        slots: [
          {
            dayOfWeek: 0,
            startMinuteOfDay: 180,
            endMinuteOfDay: 210,
          },
        ],
      }),
    ).not.toThrow();
  });

  it('rejects an ambiguous fall-back local time', () => {
    expect(() =>
      assertWeeklySlotsHaveValidLocalTimes({
        weekStartDate: new Date('2026-11-01T00:00:00.000Z'),
        timezone: 'America/New_York',
        slots: [
          {
            dayOfWeek: 0,
            startMinuteOfDay: 60,
            endMinuteOfDay: 90,
          },
        ],
      }),
    ).toThrow(BadRequestException);
  });
});
