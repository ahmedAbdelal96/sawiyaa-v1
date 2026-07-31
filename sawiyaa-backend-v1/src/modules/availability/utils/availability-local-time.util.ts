import { BadRequestException } from '@nestjs/common';
import {
  addDaysToCalendarDate,
  calendarDateToIsoDate,
  getCalendarDateParts,
  resolveZonedDateTime,
} from './availability-timezone.util';

export function assertWeeklySlotsHaveValidLocalTimes(input: {
  weekStartDate: Date;
  timezone: string;
  slots: Array<{
    dayOfWeek: number;
    startMinuteOfDay: number;
    endMinuteOfDay: number;
  }>;
}): void {
  const weekStart = getCalendarDateParts(input.weekStartDate, 'UTC');

  for (const slot of input.slots) {
    const localDate = addDaysToCalendarDate(weekStart, slot.dayOfWeek);
    for (const minuteOfDay of [slot.startMinuteOfDay, slot.endMinuteOfDay]) {
      const hour = Math.floor(minuteOfDay / 60);
      const minute = minuteOfDay % 60;
      const resolution = resolveZonedDateTime(
        { ...localDate, hour, minute },
        input.timezone,
      );

      if (resolution.status !== 'valid') {
        throw new BadRequestException({
          messageKey: 'availability.errors.invalidLocalTime',
          args: {
            date: calendarDateToIsoDate(localDate),
            time: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
            timezone: input.timezone,
            reason: resolution.status,
          },
          errorCode:
            resolution.status === 'ambiguous'
              ? 'AVAILABILITY_AMBIGUOUS_LOCAL_TIME'
              : 'AVAILABILITY_NONEXISTENT_LOCAL_TIME',
        });
      }
    }
  }
}
