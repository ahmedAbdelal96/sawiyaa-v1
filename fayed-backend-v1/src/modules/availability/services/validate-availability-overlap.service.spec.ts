import { ValidateAvailabilityOverlapService } from './validate-availability-overlap.service';

describe('ValidateAvailabilityOverlapService', () => {
  const service = new ValidateAvailabilityOverlapService();

  it('accepts non-overlapping weekly slots on the same day', () => {
    expect(() =>
      service.validateWeeklySlots([
        {
          dayOfWeek: 0,
          durationMinutes: 30,
          startMinuteOfDay: 600,
          endMinuteOfDay: 630,
        },
        {
          dayOfWeek: 0,
          durationMinutes: 30,
          startMinuteOfDay: 630,
          endMinuteOfDay: 660,
        },
        {
          dayOfWeek: 0,
          durationMinutes: 60,
          startMinuteOfDay: 720,
          endMinuteOfDay: 780,
        },
      ]),
    ).not.toThrow();
  });

  it('accepts overlapping weekly slots when durations differ', () => {
    expect(() =>
      service.validateWeeklySlots([
        {
          dayOfWeek: 2,
          durationMinutes: 30,
          startMinuteOfDay: 600,
          endMinuteOfDay: 630,
        },
        {
          dayOfWeek: 2,
          durationMinutes: 60,
          startMinuteOfDay: 600,
          endMinuteOfDay: 660,
        },
      ]),
    ).not.toThrow();
  });

  it('rejects overlapping weekly slots on the same day', () => {
    expect(() =>
      service.validateWeeklySlots([
        {
          dayOfWeek: 1,
          durationMinutes: 30,
          startMinuteOfDay: 600,
          endMinuteOfDay: 660,
        },
        {
          dayOfWeek: 1,
          durationMinutes: 30,
          startMinuteOfDay: 720,
          endMinuteOfDay: 780,
        },
      ]),
    ).toThrow();
  });

  it('rejects a mismatched duration and range', () => {
    expect(() =>
      service.validateWeeklySlots([
        {
          dayOfWeek: 3,
          durationMinutes: 60,
          startMinuteOfDay: 600,
          endMinuteOfDay: 630,
        },
      ]),
    ).toThrow();
  });
});
