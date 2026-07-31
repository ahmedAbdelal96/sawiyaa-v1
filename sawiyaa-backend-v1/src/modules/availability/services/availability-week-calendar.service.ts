import { BadRequestException, Injectable, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DEFAULT_AVAILABILITY_FUTURE_WEEKS_ALLOWED } from '@config/availability.config';
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

export interface AvailabilityActiveWindow {
  timezone: string;
  futureWeeksAllowed: number;
  currentWeek: AvailabilityWeekDateRange;
  weeks: AvailabilityWeekDateRange[];
  activeRange: {
    startWeekDate: string;
    endWeekDate: string;
  };
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
  constructor(@Optional() private readonly configService?: ConfigService) {}

  getFutureWeeksAllowed(): number {
    return this.configService?.get<number>('availability.futureWeeksAllowed') ?? DEFAULT_AVAILABILITY_FUTURE_WEEKS_ALLOWED;
  }

  getCurrentWeekRange(input: { timezone: string; now?: Date }): AvailabilityWeekDateRange {
    const now = input.now ?? new Date();
    const todayInTimezone = getCalendarDateParts(now, input.timezone);
    const currentWeekStart = addDaysToCalendarDate(
      todayInTimezone,
      -getWeekdayIndex(todayInTimezone),
    );

    return this.toRange(currentWeekStart);
  }

  getActiveWindow(input: { timezone: string; now?: Date }): AvailabilityActiveWindow {
    const currentWeek = this.getCurrentWeekRange(input);
    const weeks = Array.from({ length: this.getFutureWeeksAllowed() + 1 }, (_, index) =>
      this.toRange(
        addDaysToCalendarDate(
          this.parseDate(currentWeek.startDate),
          index * 7,
        ),
      ),
    );
    const lastWeek = weeks[weeks.length - 1];

    return {
      timezone: input.timezone,
      futureWeeksAllowed: this.getFutureWeeksAllowed(),
      currentWeek,
      weeks,
      activeRange: {
        startWeekDate: currentWeek.startDateIso,
        endWeekDate: lastWeek.endDateIso,
      },
    };
  }

  getWeekRangeByStartDate(input: { weekStartDate: string }): AvailabilityWeekDateRange {
    return this.resolveWeekWindowFromStartDate(input);
  }

  isSundayWeekStart(weekStartDate: string): boolean {
    try {
      return getWeekdayIndex(this.parseCalendarDate(weekStartDate)) === 0;
    } catch {
      return false;
    }
  }

  normalizeWeekStart(weekStartDate: string): string {
    return this.resolveWeekWindowFromStartDate({ weekStartDate }).startDateIso;
  }

  assertWeekInsideActiveWindow(input: {
    weekStartDate: string | Date;
    timezone: string;
    now?: Date;
  }): AvailabilityWeekDateRange {
    const range = typeof input.weekStartDate === 'string'
      ? this.resolveWeekWindowFromStartDate({ weekStartDate: input.weekStartDate })
      : this.resolveWeekWindowFromStartDate({
          weekStartDate: input.weekStartDate.toISOString().slice(0, 10),
        });
    const window = this.getActiveWindow({ timezone: input.timezone, now: input.now });
    const isInside = window.weeks.some(
      (week) => week.startDateIso === range.startDateIso,
    );

    if (!isInside) {
      throw new BadRequestException({
        messageKey: 'availability.errors.weekOutsideActiveWindow',
        errorCode: 'AVAILABILITY_WEEK_OUTSIDE_ACTIVE_WINDOW',
      });
    }

    return range;
  }

  resolveCurrentAndNextWeekWindow(input: {
    timezone: string;
    now?: Date;
  }): AvailabilityWeekWindow {
    const activeWindow = this.getActiveWindow(input);
    return {
      currentWeek: activeWindow.weeks[0],
      nextWeek: activeWindow.weeks[1],
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

  private toRange(startDate: { year: number; month: number; day: number }): AvailabilityWeekDateRange {
    const endDate = addDaysToCalendarDate(startDate, 6);

    return {
      startDate: calendarDatePartsToUtcDate(startDate),
      endDate: calendarDatePartsToUtcDate(endDate),
      startDateIso: calendarDateToIsoDate(startDate),
      endDateIso: calendarDateToIsoDate(endDate),
    };
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
