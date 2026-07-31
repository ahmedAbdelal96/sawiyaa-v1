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

  it('accepts nested 30-minute alternatives alongside 60-minute alternatives', () => {
    expect(() => service.validateWeeklySlots([
      { dayOfWeek: 0, durationMinutes: 30, startMinuteOfDay: 600, endMinuteOfDay: 630 },
      { dayOfWeek: 0, durationMinutes: 30, startMinuteOfDay: 630, endMinuteOfDay: 660 },
      { dayOfWeek: 0, durationMinutes: 60, startMinuteOfDay: 600, endMinuteOfDay: 660 },
    ])).not.toThrow();
  });

  it.each([30, 60])('rejects an exact duplicate inside the %s-minute duration group', (durationMinutes) => {
    expect(() => service.validateWeeklySlots([
      { dayOfWeek: 0, durationMinutes: durationMinutes as 30 | 60, startMinuteOfDay: 600, endMinuteOfDay: 600 + durationMinutes },
      { dayOfWeek: 0, durationMinutes: durationMinutes as 30 | 60, startMinuteOfDay: 600, endMinuteOfDay: 600 + durationMinutes },
    ])).toThrow();
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

  it.each([90, 150])('rejects a 60-minute slot with a half-hour start at %s', (startMinuteOfDay) => {
    expect(() => service.validateWeeklySlots([
      { dayOfWeek: 0, durationMinutes: 60, startMinuteOfDay, endMinuteOfDay: startMinuteOfDay + 60 },
    ])).toThrow();
  });

  it.each([
    { startMinuteOfDay: 23 * 60 + 30, endMinuteOfDay: 24 * 60, durationMinutes: 30, valid: true },
    { startMinuteOfDay: 23 * 60 + 30, endMinuteOfDay: 24 * 60 + 30, durationMinutes: 60, valid: false },
    { startMinuteOfDay: 23 * 60, endMinuteOfDay: 24 * 60, durationMinutes: 60, valid: true },
  ])('enforces the local-midnight boundary for $durationMinutes minutes at $startMinuteOfDay', ({ valid, ...slot }) => {
    const assertion = () => service.validateWeeklySlots([{ dayOfWeek: 0, ...slot }]);
    if (valid) expect(assertion).not.toThrow();
    else expect(assertion).toThrow();
  });
});
