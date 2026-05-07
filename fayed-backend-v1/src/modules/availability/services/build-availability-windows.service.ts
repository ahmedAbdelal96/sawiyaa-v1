import { Injectable } from '@nestjs/common';
import {
  AvailabilityException,
  AvailabilityExceptionType,
  AvailabilitySlot,
} from '@prisma/client';
import {
  addDaysToCalendarDate,
  calendarDateToIsoDate,
  compareCalendarDates,
  getCalendarDateParts,
  getWeekdayIndex,
  zonedDateTimeToUtc,
} from '../utils/availability-timezone.util';
import { AvailabilityWindow } from '../types/availability.types';
import { WEEKDAY_ENUM_TO_INDEX } from '../utils/availability-weekday.util';

interface WindowRange {
  startsAt: Date;
  endsAt: Date;
  durationMinutes: number | null;
}

/**
 * Window builder derives concrete UTC availability windows from recurring schedule plus exceptions.
 * V1 stops at "available windows" and intentionally does not reserve, lock, or create sessions.
 */
@Injectable()
export class BuildAvailabilityWindowsService {
  buildForRange(input: {
    timezone: string;
    weeklySlots: AvailabilitySlot[];
    exceptions: AvailabilityException[];
    fromUtc: Date;
    toUtc: Date;
  }): AvailabilityWindow[] {
    const baseWindows = this.buildWeeklyWindows(
      input.weeklySlots,
      input.timezone,
      input.fromUtc,
      input.toUtc,
    );

    const extraOpenWindows = input.exceptions
      .filter(
        (exception) =>
          exception.isActive &&
          exception.type === AvailabilityExceptionType.OPEN_EXTRA,
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
          exception.type === AvailabilityExceptionType.BLOCK,
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

    return availableAfterBlocks
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

  private buildWeeklyWindows(
    weeklySlots: AvailabilitySlot[],
    timezone: string,
    fromUtc: Date,
    toUtc: Date,
  ): WindowRange[] {
    const windows: WindowRange[] = [];
    const localStartDate = addDaysToCalendarDate(
      getCalendarDateParts(fromUtc, timezone),
      -1,
    );
    const localEndDate = addDaysToCalendarDate(
      getCalendarDateParts(toUtc, timezone),
      1,
    );

    for (
      let current = localStartDate;
      compareCalendarDates(current, localEndDate) <= 0;
      current = addDaysToCalendarDate(current, 1)
    ) {
      const weekdayIndex = getWeekdayIndex(current);

      const daySlots = weeklySlots.filter(
        (slot) =>
          slot.isActive &&
          WEEKDAY_ENUM_TO_INDEX[slot.weekday] === weekdayIndex &&
          this.isEffectiveOnDate(slot, current),
      );

      for (const slot of daySlots) {
        const startsAt = zonedDateTimeToUtc(
          {
            ...current,
            hour: Math.floor(slot.startMinuteOfDay / 60),
            minute: slot.startMinuteOfDay % 60,
          },
          timezone,
        );
        const endsAt = zonedDateTimeToUtc(
          {
            ...current,
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

  private isEffectiveOnDate(
    slot: Pick<AvailabilitySlot, 'effectiveFrom' | 'effectiveTo'>,
    current: { year: number; month: number; day: number },
  ): boolean {
    const currentDate = calendarDateToIsoDate(current);
    const effectiveFrom = slot.effectiveFrom
      ? slot.effectiveFrom.toISOString().slice(0, 10)
      : null;
    const effectiveTo = slot.effectiveTo
      ? slot.effectiveTo.toISOString().slice(0, 10)
      : null;

    if (effectiveFrom && currentDate < effectiveFrom) {
      return false;
    }

    if (effectiveTo && currentDate > effectiveTo) {
      return false;
    }

    return true;
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
