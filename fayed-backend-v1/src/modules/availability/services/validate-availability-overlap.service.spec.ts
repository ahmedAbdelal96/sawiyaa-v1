import { ValidateAvailabilityOverlapService } from './validate-availability-overlap.service';

describe('ValidateAvailabilityOverlapService', () => {
  const service = new ValidateAvailabilityOverlapService();

  it('accepts non-overlapping weekly slots on the same day', () => {
    expect(() =>
      service.validateWeeklySlots([
        {
          dayOfWeek: 0,
          startMinuteOfDay: 600,
          endMinuteOfDay: 720,
        },
        {
          dayOfWeek: 0,
          startMinuteOfDay: 720,
          endMinuteOfDay: 840,
        },
      ]),
    ).not.toThrow();
  });

  it('rejects overlapping weekly slots on the same day', () => {
    expect(() =>
      service.validateWeeklySlots([
        {
          dayOfWeek: 1,
          startMinuteOfDay: 600,
          endMinuteOfDay: 780,
        },
        {
          dayOfWeek: 1,
          startMinuteOfDay: 720,
          endMinuteOfDay: 900,
        },
      ]),
    ).toThrow();
  });
});
