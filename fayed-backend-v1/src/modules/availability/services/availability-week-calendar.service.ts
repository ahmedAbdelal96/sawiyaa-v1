import { BadRequestException, Injectable } from '@nestjs/common';
import {
  addDaysToCalendarDate,
  calendarDateToIsoDate,
  compareCalendarDates,
  getCalendarDateParts,
  getWeekdayIndex,
} from '../utils/availability-timezone.util';

export interface AvailabilityWeekDateRange {
  startDate: Date;
  endDate: Date;
  startDateIso: string;
  endDateIso: string;
}

export interface AvailabilityWeekWindow {
  currentWeek: AvailabilityWeekDateRange;
  nextWeek: AvailabilityWeekDateRange;
}

function calendarDatePartsToUtcDate(input: {
  year: number;
  month: number;
  day: number;
}): Date {
  return new Date(Date.UTC(input.year, input.month - 1, input.day));
}

@Injectable()
export class AvailabilityWeekCalendarService {
  resolveCurrentAndNextWeekWindow(input: {
    timezone: string;
    now?: Date;
  }): AvailabilityWeekWindow {
    const now = input.now ?? new Date();
    const todayInTimezone = getCalendarDateParts(now, input.timezone);
    const currentWeekStart = addDaysToCalendarDate(
      todayInTimezone,
      -getWeekdayIndex(todayInTimezone),
    );
    const currentWeekEnd = addDaysToCalendarDate(currentWeekStart, 6);
    const nextWeekStart = addDaysToCalendarDate(currentWeekStart, 7);
    const nextWeekEnd = addDaysToCalendarDate(nextWeekStart, 6);

    return {
      currentWeek: {
        startDate: calendarDatePartsToUtcDate(currentWeekStart),
        endDate: calendarDatePartsToUtcDate(currentWeekEnd),
        startDateIso: calendarDateToIsoDate(currentWeekStart),
        endDateIso: calendarDateToIsoDate(currentWeekEnd),
      },
      nextWeek: {
        startDate: calendarDatePartsToUtcDate(nextWeekStart),
        endDate: calendarDatePartsToUtcDate(nextWeekEnd),
        startDateIso: calendarDateToIsoDate(nextWeekStart),
        endDateIso: calendarDateToIsoDate(nextWeekEnd),
      },
    };
  }

  resolveWeekWindowFromStartDate(input: { weekStartDate: string }): AvailabilityWeekDateRange {
    const parsed = this.parseCalendarDate(input.weekStartDate);
    const weekday = getWeekdayIndex(parsed);

    if (weekday !== 0) {
      throw new BadRequestException({
        messageKey: 'availability.errors.invalidWeekStartDate',
        errorCode: 'AVAILABILITY_INVALID_WEEK_START_DATE',
      });
    }

    const weekEndDate = addDaysToCalendarDate(parsed, 6);

    return {
      startDate: calendarDatePartsToUtcDate(parsed),
      endDate: calendarDatePartsToUtcDate(weekEndDate),
      startDateIso: calendarDateToIsoDate(parsed),
      endDateIso: calendarDateToIsoDate(weekEndDate),
    };
  }

  assertWeekStartBeforeOrEqualEndDate(startDate: Date, endDate: Date): void {
    if (compareCalendarDates(
      this.parseDate(startDate),
      this.parseDate(endDate),
    ) > 0) {
      throw new BadRequestException({
        messageKey: 'availability.errors.invalidWeekRange',
        errorCode: 'AVAILABILITY_INVALID_WEEK_RANGE',
      });
    }
  }

  private parseCalendarDate(value: string): {
    year: number;
    month: number;
    day: number;
  } {
    const parsed = new Date(`${value}T00:00:00.000Z`);

    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException({
        messageKey: 'availability.errors.invalidWeekStartDate',
        errorCode: 'AVAILABILITY_INVALID_WEEK_START_DATE',
      });
    }

    return this.parseDate(parsed);
  }

  private parseDate(value: Date): {
    year: number;
    month: number;
    day: number;
  } {
    return {
      year: value.getUTCFullYear(),
      month: value.getUTCMonth() + 1,
      day: value.getUTCDate(),
    };
  }
}
