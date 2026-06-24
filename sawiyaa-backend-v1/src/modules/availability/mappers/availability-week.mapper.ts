import { Injectable } from '@nestjs/common';
import { AvailabilityWeekStatus, AvailabilityWeekday } from '@prisma/client';
import { WEEKDAY_ENUM_TO_INDEX } from '../utils/availability-weekday.util';
import {
  compareCalendarDates,
  getCalendarDateParts,
} from '../utils/availability-timezone.util';
import {
  AvailabilityWeekOverviewViewModel,
  AvailabilityWeekReminderState,
  AvailabilityWeekSlotViewModel,
  AvailabilityWeekUiStatus,
  AvailabilityWeekViewModel,
} from '../types/availability-week.types';
import { AvailabilityWeekDateRange } from '../services/availability-week-calendar.service';
import { PractitionerAvailabilityWeekWithSlots } from '../repositories/practitioner-availability-week.repository';
import { WeeklyAvailabilitySlotViewModel } from '../types/availability.types';

@Injectable()
export class AvailabilityWeekMapper {
  toSlot(input: {
    id: string;
    weekday: AvailabilityWeekday;
    startMinuteOfDay: number;
    endMinuteOfDay: number;
    durationMinutes: number;
    timezone: string;
    createdAt: Date;
    updatedAt: Date;
  }): AvailabilityWeekSlotViewModel {
    return {
      id: input.id,
      dayOfWeek: WEEKDAY_ENUM_TO_INDEX[input.weekday],
      weekday: input.weekday,
      startMinuteOfDay: input.startMinuteOfDay,
      endMinuteOfDay: input.endMinuteOfDay,
      durationMinutes: input.durationMinutes,
      timezone: input.timezone,
      createdAt: input.createdAt.toISOString(),
      updatedAt: input.updatedAt.toISOString(),
    };
  }

  toPublicWeeklySlot(input: {
    id: string;
    weekday: AvailabilityWeekday;
    startMinuteOfDay: number;
    endMinuteOfDay: number;
    durationMinutes: number;
    timezone: string;
    weekStartDate: Date;
    weekEndDate: Date;
  }): WeeklyAvailabilitySlotViewModel {
    return {
      id: input.id,
      dayOfWeek: WEEKDAY_ENUM_TO_INDEX[input.weekday],
      weekday: input.weekday,
      startMinuteOfDay: input.startMinuteOfDay,
      endMinuteOfDay: input.endMinuteOfDay,
      durationMinutes: input.durationMinutes,
      timezone: input.timezone,
      isActive: true,
      effectiveFrom: input.weekStartDate.toISOString().slice(0, 10),
      effectiveTo: input.weekEndDate.toISOString().slice(0, 10),
    };
  }

  toWeek(input: {
    week: PractitionerAvailabilityWeekWithSlots | null;
    weekStartDate: Date;
    weekEndDate: Date;
    timezone: string;
  }): AvailabilityWeekViewModel {
    if (!input.week) {
      return {
        id: null,
        weekStartDate: input.weekStartDate.toISOString().slice(0, 10),
        weekEndDate: input.weekEndDate.toISOString().slice(0, 10),
        timezone: input.timezone,
        status: 'NOT_SET',
        copiedFromWeekId: null,
        publishedAt: null,
        archivedAt: null,
        createdAt: null,
        updatedAt: null,
        isEditable: false,
        hasSlots: false,
        slots: [],
      };
    }

    const status: AvailabilityWeekUiStatus = input.week.status;

    return {
      id: input.week.id,
      weekStartDate: input.week.weekStartDate.toISOString().slice(0, 10),
      weekEndDate: input.week.weekEndDate.toISOString().slice(0, 10),
      timezone: input.week.timezone,
      status,
      copiedFromWeekId: input.week.copiedFromWeekId ?? null,
      publishedAt: input.week.publishedAt?.toISOString() ?? null,
      archivedAt: input.week.archivedAt?.toISOString() ?? null,
      createdAt: input.week.createdAt.toISOString(),
      updatedAt: input.week.updatedAt.toISOString(),
      isEditable: input.week.status === AvailabilityWeekStatus.DRAFT,
      hasSlots: input.week.slots.length > 0,
      slots: input.week.slots.map((slot) => this.toSlot(slot)),
    };
  }

  toOverview(input: {
    timezone: string;
    currentWeek: PractitionerAvailabilityWeekWithSlots | null;
    nextWeek: PractitionerAvailabilityWeekWithSlots | null;
    currentWeekRange: AvailabilityWeekDateRange;
    nextWeekRange: AvailabilityWeekDateRange;
    now?: Date;
  }): AvailabilityWeekOverviewViewModel {
    const now = input.now ?? new Date();
    const reminderContext = this.resolveWeekEndReminderContext({
      timezone: input.timezone,
      currentWeek: input.currentWeek,
      nextWeek: input.nextWeek,
      currentWeekRange: input.currentWeekRange,
      now,
    });

    return {
      timezone: input.timezone,
      currentWeek: this.toWeek({
        week: input.currentWeek,
        weekStartDate: input.currentWeekRange.startDate,
        weekEndDate: input.currentWeekRange.endDate,
        timezone: input.timezone,
      }),
      nextWeek: this.toWeek({
        week: input.nextWeek,
        weekStartDate: input.nextWeekRange.startDate,
        weekEndDate: input.nextWeekRange.endDate,
        timezone: input.timezone,
      }),
      reminderState: this.resolveReminderState(input.currentWeek, input.nextWeek),
      shouldPromptForNextWeek: reminderContext.shouldPromptForNextWeek,
      daysUntilCurrentWeekEnds: reminderContext.daysUntilCurrentWeekEnds,
      nextWeekPublished: reminderContext.nextWeekPublished,
    };
  }

  private resolveWeekEndReminderContext(input: {
    timezone: string;
    currentWeek: PractitionerAvailabilityWeekWithSlots | null;
    nextWeek: PractitionerAvailabilityWeekWithSlots | null;
    currentWeekRange: AvailabilityWeekDateRange;
    now: Date;
  }): {
    shouldPromptForNextWeek: boolean;
    daysUntilCurrentWeekEnds: number | null;
    nextWeekPublished: boolean;
  } {
    const nextWeekPublished = input.nextWeek?.status === AvailabilityWeekStatus.PUBLISHED;

    if (!input.currentWeek) {
      return {
        shouldPromptForNextWeek: false,
        daysUntilCurrentWeekEnds: null,
        nextWeekPublished,
      };
    }

    const today = getCalendarDateParts(input.now, input.timezone);
    const currentWeekEnd = this.parseIsoDate(input.currentWeekRange.endDateIso);
    const daysUntilCurrentWeekEnds = Math.max(
      0,
      Math.round(
        compareCalendarDates(currentWeekEnd, today) / (24 * 60 * 60 * 1000),
      ),
    );
    const currentWeekPublished =
      input.currentWeek.status === AvailabilityWeekStatus.PUBLISHED;

    return {
      shouldPromptForNextWeek:
        currentWeekPublished &&
        !nextWeekPublished &&
        daysUntilCurrentWeekEnds <= 3,
      daysUntilCurrentWeekEnds,
      nextWeekPublished,
    };
  }

  private parseIsoDate(value: string): {
    year: number;
    month: number;
    day: number;
  } {
    const [year, month, day] = value.split('-').map((part) => Number(part));

    return { year, month, day };
  }

  resolveReminderState(
    currentWeek: PractitionerAvailabilityWeekWithSlots | null,
    nextWeek: PractitionerAvailabilityWeekWithSlots | null,
  ): AvailabilityWeekReminderState {
    if (!currentWeek) {
      return 'CURRENT_WEEK_MISSING';
    }

    if (!nextWeek) {
      return 'NEXT_WEEK_MISSING';
    }

    if (
      currentWeek.status === AvailabilityWeekStatus.DRAFT ||
      nextWeek.status === AvailabilityWeekStatus.DRAFT
    ) {
      return 'DRAFT_EXISTS';
    }

    return 'NONE';
  }
}
