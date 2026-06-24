import { Injectable } from '@nestjs/common';
import {
  AvailabilityException,
  AvailabilityExceptionType,
  AvailabilityWeekStatus,
  AvailabilityWeekday,
} from '@prisma/client';
import {
  addDaysToCalendarDate,
  getCalendarDateParts,
  isValidIanaTimeZone,
  zonedDateTimeToUtc,
} from '../utils/availability-timezone.util';
import { AvailabilityWindow } from '../types/availability.types';
import { WEEKDAY_ENUM_TO_INDEX } from '../utils/availability-weekday.util';

interface WindowRange {
  startsAt: Date;
  endsAt: Date;
  durationMinutes: number | null;
}

interface BookedSessionRange {
  startsAt: Date;
  endsAt: Date;
}

interface PublishedWeekWindowSlot {
  id: string;
  weekday: AvailabilityWeekday;
  startMinuteOfDay: number;
  endMinuteOfDay: number;
  durationMinutes: number;
  timezone: string;
}

interface PublishedWeekWindow {
  id: string;
  weekStartDate: Date;
  weekEndDate: Date;
  timezone: string;
  status: AvailabilityWeekStatus;
  slots: PublishedWeekWindowSlot[];
}

/**
 * Public windows are derived from published week plans only.
 * The builder keeps legacy recurring schedule logic out of the booking-facing read path.
 */
@Injectable()
export class BuildPublishedWeekAvailabilityWindowsService {
  buildForRange(input: {
    timezone: string;
    weeks: PublishedWeekWindow[];
    exceptions: AvailabilityException[];
    bookedSessions?: BookedSessionRange[];
    fromUtc: Date;
    toUtc: Date;
    now?: Date;
  }): AvailabilityWindow[] {
    const now = input.now ?? new Date();
    const publishedWeeks = [...input.weeks]
      .filter((week) => week.status === AvailabilityWeekStatus.PUBLISHED)
      .sort(
        (left, right) =>
          left.weekStartDate.getTime() - right.weekStartDate.getTime() ||
          left.weekEndDate.getTime() - right.weekEndDate.getTime(),
      );

    if (publishedWeeks.length === 0) {
      return [];
    }

    const effectiveFrom = new Date(
      Math.max(input.fromUtc.getTime(), now.getTime()),
    );
    const effectiveTo = input.toUtc;

    if (effectiveTo.getTime() <= effectiveFrom.getTime()) {
      return [];
    }

    const weekIds = new Set(publishedWeeks.map((week) => week.id));
    const baseWindows = this.buildWindowsFromWeeks(
      publishedWeeks,
      input.timezone,
      effectiveFrom,
      effectiveTo,
    );

    const extraOpenWindows = input.exceptions
      .filter(
        (exception) =>
          exception.isActive &&
          exception.type === AvailabilityExceptionType.OPEN_EXTRA &&
          this.isExceptionVisibleForPublishedWeeks(exception, weekIds),
      )
      .map((exception) => ({
        startsAt: exception.startsAtUtc,
        endsAt: exception.endsAtUtc,
        durationMinutes: null,
      }));

    const blockWindows = input.exceptions
      .filter(
        (exception) =>
          exception.isActive &&
          exception.type === AvailabilityExceptionType.BLOCK &&
          this.isExceptionVisibleForPublishedWeeks(exception, weekIds),
      )
      .map((exception) => ({
        startsAt: exception.startsAtUtc,
        endsAt: exception.endsAtUtc,
        durationMinutes: null,
      }));

    const mergedBase = this.mergeWindows([...baseWindows, ...extraOpenWindows]);
    const availableAfterBlocks = this.subtractBlockedRanges(
      mergedBase,
      blockWindows,
    );
    const availableAfterBookings = this.subtractBlockedRanges(
      availableAfterBlocks,
      (input.bookedSessions ?? []).map((session) => ({
        startsAt: session.startsAt,
        endsAt: session.endsAt,
        durationMinutes: null,
      })),
    );

    return availableAfterBookings
      .sort(
        (left, right) =>
          left.startsAt.getTime() - right.startsAt.getTime() ||
          left.endsAt.getTime() - right.endsAt.getTime() ||
          (left.durationMinutes ?? 0) - (right.durationMinutes ?? 0),
      )
      .map((window) => ({
        startsAt: window.startsAt.toISOString(),
        endsAt: window.endsAt.toISOString(),
        durationMinutes: window.durationMinutes,
      }))
      .filter((window) => window.endsAt > window.startsAt);
  }

  private buildWindowsFromWeeks(
    weeks: PublishedWeekWindow[],
    fallbackTimezone: string,
    fromUtc: Date,
    toUtc: Date,
  ): WindowRange[] {
    const windows: WindowRange[] = [];

    for (const week of weeks) {
      const weekStart = getCalendarDateParts(week.weekStartDate, 'UTC');

      for (const slot of week.slots) {
        const localDate = addDaysToCalendarDate(
          weekStart,
          WEEKDAY_ENUM_TO_INDEX[slot.weekday],
        );
        const timezone = this.resolveSlotTimezone(
          slot.timezone,
          week.timezone,
          fallbackTimezone,
        );
        const startsAt = zonedDateTimeToUtc(
          {
            ...localDate,
            hour: Math.floor(slot.startMinuteOfDay / 60),
            minute: slot.startMinuteOfDay % 60,
          },
          timezone,
        );
        const endsAt = zonedDateTimeToUtc(
          {
            ...localDate,
            hour: Math.floor(slot.endMinuteOfDay / 60),
            minute: slot.endMinuteOfDay % 60,
          },
          timezone,
        );

        if (endsAt <= fromUtc || startsAt >= toUtc || endsAt <= startsAt) {
          continue;
        }

        windows.push({
          startsAt: startsAt < fromUtc ? fromUtc : startsAt,
          endsAt: endsAt > toUtc ? toUtc : endsAt,
          durationMinutes: slot.durationMinutes,
        });
      }
    }

    return windows;
  }

  private resolveSlotTimezone(
    slotTimezone: string | null | undefined,
    weekTimezone: string,
    fallbackTimezone: string,
  ): string {
    const timezoneCandidates = [
      slotTimezone?.trim(),
      weekTimezone?.trim(),
      fallbackTimezone?.trim(),
      'UTC',
    ].filter((candidate): candidate is string => Boolean(candidate));

    return (
      timezoneCandidates.find((candidate) => isValidIanaTimeZone(candidate)) ??
      'UTC'
    );
  }

  private isExceptionVisibleForPublishedWeeks(
    exception: AvailabilityException,
    publishedWeekIds: Set<string>,
  ): boolean {
    if (!exception.availabilityWeekId) {
      return true;
    }

    return publishedWeekIds.has(exception.availabilityWeekId);
  }

  private mergeWindows(windows: WindowRange[]): WindowRange[] {
    if (windows.length === 0) {
      return [];
    }

    const ordered = [...windows].sort(
      (left, right) =>
        (left.durationMinutes ?? 0) - (right.durationMinutes ?? 0) ||
        left.startsAt.getTime() - right.startsAt.getTime() ||
        left.endsAt.getTime() - right.endsAt.getTime(),
    );
    const merged: WindowRange[] = [{ ...ordered[0] }];

    for (let index = 1; index < ordered.length; index += 1) {
      const current = ordered[index];
      const last = merged[merged.length - 1];

      if (
        current.durationMinutes === last.durationMinutes &&
        current.startsAt.getTime() <= last.endsAt.getTime()
      ) {
        if (current.endsAt.getTime() > last.endsAt.getTime()) {
          last.endsAt = current.endsAt;
        }

        continue;
      }

      merged.push({ ...current });
    }

    return merged;
  }

  private subtractBlockedRanges(
    baseWindows: WindowRange[],
    blockedWindows: WindowRange[],
  ): WindowRange[] {
    let result = this.mergeWindows(baseWindows);
    const mergedBlocks = this.mergeWindows(blockedWindows);

    for (const block of mergedBlocks) {
      const next: WindowRange[] = [];

      for (const window of result) {
        if (
          block.endsAt.getTime() <= window.startsAt.getTime() ||
          block.startsAt.getTime() >= window.endsAt.getTime()
        ) {
          next.push(window);
          continue;
        }

        if (block.startsAt.getTime() > window.startsAt.getTime()) {
          next.push({
            startsAt: window.startsAt,
            endsAt: block.startsAt,
            durationMinutes: window.durationMinutes,
          });
        }

        if (block.endsAt.getTime() < window.endsAt.getTime()) {
          next.push({
            startsAt: block.endsAt,
            endsAt: window.endsAt,
            durationMinutes: window.durationMinutes,
          });
        }
      }

      result = next.filter(
        (window) => window.endsAt.getTime() > window.startsAt.getTime(),
      );
    }

    return result;
  }
}
