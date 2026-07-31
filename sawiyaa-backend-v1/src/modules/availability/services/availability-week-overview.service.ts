import { Injectable } from '@nestjs/common';
import { AvailabilityWeekMapper } from '../mappers/availability-week.mapper';
import { PractitionerAvailabilityWeekRepository } from '../repositories/practitioner-availability-week.repository';
import { AvailabilityWeekCalendarService } from './availability-week-calendar.service';
import { AvailabilityWeekOverviewViewModel, AvailabilityWeekUiStatus } from '../types/availability-week.types';
import { AvailabilitySlotEditabilityService } from './availability-slot-editability.service';

@Injectable()
export class AvailabilityWeekOverviewService {
  constructor(
    private readonly availabilityWeekRepository: PractitionerAvailabilityWeekRepository,
    private readonly availabilityWeekCalendarService: AvailabilityWeekCalendarService,
    private readonly availabilityWeekMapper: AvailabilityWeekMapper,
    private readonly availabilitySlotEditabilityService: AvailabilitySlotEditabilityService,
  ) {}

  async buildForPractitioner(input: {
    practitionerId: string;
    timezone: string;
    now?: Date;
  }): Promise<AvailabilityWeekOverviewViewModel> {
    const now = input.now ?? new Date();
    const window = this.availabilityWeekCalendarService.getActiveWindow({
      timezone: input.timezone,
      now,
    });

    const weeks = await this.availabilityWeekRepository.findManyByPractitionerAndWeekStarts(
      input.practitionerId,
      window.weeks.map((week) => week.startDate),
    );

    const currentWeek = weeks.find((week) => week.weekStartDate.getTime() === window.currentWeek.startDate.getTime());
    const nextWeekRange = window.weeks[1];
    const nextWeek = weeks.find((week) => week.weekStartDate.getTime() === nextWeekRange.startDate.getTime());

    const editabilityByWeek = this.availabilitySlotEditabilityService.calculateEditabilityForWeeks
      ? await this.availabilitySlotEditabilityService.calculateEditabilityForWeeks({
          practitionerId: input.practitionerId,
          weeks: weeks.map((week) => ({
            weekStartDate: week.weekStartDate,
            weekEndDate: week.weekEndDate,
            timezone: week.timezone,
            slots: week.slots,
            isArchived: week.status === 'ARCHIVED',
          })),
          now,
        })
      : new Map<string, Map<string, any>>();

    const currentEditabilityMap = currentWeek
      ? editabilityByWeek.get(currentWeek.weekStartDate.toISOString().slice(0, 10)) ?? await this.availabilitySlotEditabilityService.calculateEditability({
          practitionerId: input.practitionerId,
          weekStartDate: window.currentWeek.startDate,
          weekEndDate: window.currentWeek.endDate,
          timezone: currentWeek.timezone,
          slots: currentWeek.slots,
          isArchived: currentWeek.status === 'ARCHIVED',
          now,
        })
      : undefined;

    const nextEditabilityMap = nextWeek
      ? editabilityByWeek.get(nextWeek.weekStartDate.toISOString().slice(0, 10)) ?? await this.availabilitySlotEditabilityService.calculateEditability({
          practitionerId: input.practitionerId,
          weekStartDate: nextWeekRange.startDate,
          weekEndDate: nextWeekRange.endDate,
          timezone: nextWeek.timezone,
          slots: nextWeek.slots,
          isArchived: nextWeek.status === 'ARCHIVED',
          now,
        })
      : undefined;

    const overview = this.availabilityWeekMapper.toOverview({
      timezone: input.timezone,
      currentWeek: currentWeek ?? null,
      nextWeek: nextWeek ?? null,
      currentWeekRange: window.currentWeek,
      nextWeekRange,
      currentEditabilityMap,
      nextEditabilityMap,
      now,
    });

    if (currentWeek && !editabilityByWeek.has(currentWeek.weekStartDate.toISOString().slice(0, 10))) editabilityByWeek.set(currentWeek.weekStartDate.toISOString().slice(0, 10), currentEditabilityMap ?? new Map());
    if (nextWeek && !editabilityByWeek.has(nextWeek.weekStartDate.toISOString().slice(0, 10))) editabilityByWeek.set(nextWeek.weekStartDate.toISOString().slice(0, 10), nextEditabilityMap ?? new Map());

    const rollingWeeks = window.weeks.map((range, relativeWeekIndex) => {
      const week = weeks.find((candidate) => candidate.weekStartDate.getTime() === range.startDate.getTime());
      const status: AvailabilityWeekUiStatus = week?.status ?? 'NOT_SET';
      const editability = week
        ? editabilityByWeek.get(range.startDateIso) ?? new Map()
        : new Map();
      const containsBookings = Array.from(editability.values()).some(
        (slot: any) => slot.isBookedOrReserved,
      );
      const slotCount30Minutes = week?.slots.filter((slot) => slot.durationMinutes === 30).length ?? 0;
      const slotCount60Minutes = week?.slots.filter((slot) => slot.durationMinutes === 60).length ?? 0;

      return {
        weekId: week?.id ?? null,
        weekStartDate: range.startDateIso,
        weekEndDate: range.endDateIso,
        status,
        isCurrentWeek: relativeWeekIndex === 0,
        relativeWeekIndex,
        canCreate: !week,
        canEdit: Boolean(
          week &&
            (week.status === 'DRAFT' ||
              (week.status === 'PUBLISHED' &&
                (week.slots.length === 0 ||
                  Array.from(editability.values()).some((slot: any) => slot.canEdit)))),
        ),
        canPublish: Boolean(week && week.status === 'DRAFT' && week.slots.length > 0),
        containsBookings,
        slotCount: week?.slots.length ?? 0,
        slotCount30Minutes,
        slotCount60Minutes,
        copiedFromWeekId: week?.copiedFromWeekId ?? null,
      };
    });

    return {
      ...overview,
      weekStartsOn: 'SUNDAY' as const,
      futureWeeksAllowed: window.futureWeeksAllowed,
      activeRange: window.activeRange,
      weeks: rollingWeeks,
    };
  }
}
