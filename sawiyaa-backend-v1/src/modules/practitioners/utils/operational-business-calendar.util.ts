export type OperationalBusinessCalendarConfig = {
  timezone: string;
  weekendDays: number[];
};

export function getOperationalBusinessCalendarConfig(): OperationalBusinessCalendarConfig {
  const weekendDays = (process.env.PRACTITIONER_REVIEW_SLA_WEEKEND_DAYS ?? '5,6')
    .split(',')
    .map((value) => Number(value.trim()))
    .filter((value) => Number.isInteger(value) && value >= 0 && value <= 6);
  return {
    timezone: process.env.PRACTITIONER_REVIEW_SLA_TIMEZONE ?? 'Africa/Cairo',
    weekendDays: weekendDays.length ? weekendDays : [5, 6],
  };
}

export function addOperationalBusinessDays(
  start: Date,
  days: number,
  config = getOperationalBusinessCalendarConfig(),
): Date {
  const result = new Date(start);
  const weekdayFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: config.timezone,
    weekday: 'short',
  });
  const weekdayIndex: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  let remaining = Math.max(0, days);
  while (remaining > 0) {
    result.setUTCDate(result.getUTCDate() + 1);
    const day = weekdayIndex[weekdayFormatter.format(result)];
    if (!config.weekendDays.includes(day)) remaining -= 1;
  }
  return result;
}
