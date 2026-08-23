import {
  addOperationalBusinessDays,
  OperationalBusinessCalendarConfig,
} from './operational-business-calendar.util';

describe('operational business calendar', () => {
  const config: OperationalBusinessCalendarConfig = {
    timezone: 'Africa/Cairo',
    weekendDays: [5, 6],
  };

  it('adds one business day across the Friday/Saturday weekend', () => {
    const dueAt = addOperationalBusinessDays(
      new Date('2026-08-20T09:00:00.000Z'),
      1,
      config,
    );
    expect(dueAt.toISOString()).toBe('2026-08-23T09:00:00.000Z');
  });

  it('uses the configured timezone and weekend days', () => {
    const dueAt = addOperationalBusinessDays(
      new Date('2026-08-21T09:00:00.000Z'),
      1,
      { timezone: 'UTC', weekendDays: [0, 6] },
    );
    expect(dueAt.toISOString()).toBe('2026-08-24T09:00:00.000Z');
  });
});
