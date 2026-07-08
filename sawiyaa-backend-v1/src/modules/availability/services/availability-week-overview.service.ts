import { Injectable } from '@nestjs/common';
import { AvailabilityWeekMapper } from '../mappers/availability-week.mapper';
import { PractitionerAvailabilityWeekRepository } from '../repositories/practitioner-availability-week.repository';
import { AvailabilityWeekCalendarService } from './availability-week-calendar.service';
import { AvailabilityWeekOverviewViewModel } from '../types/availability-week.types';
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
    const window = this.availabilityWeekCalendarService.resolveCurrentAndNextWeekWindow(
      {
        timezone: input.timezone,
        now,
      },
    );

    const [weeks] = await Promise.all([
      this.availabilityWeekRepository.findManyByPractitionerAndWeekStarts(
        input.practitionerId,
        [window.currentWeek.startDate, window.nextWeek.startDate],
      ),
    ]);

    const currentWeek = weeks.find(
      (week) => week.weekStartDate.getTime() === window.currentWeek.startDate.getTime(),
    );
    const nextWeek = weeks.find(
      (week) => week.weekStartDate.getTime() === window.nextWeek.startDate.getTime(),
    );

    const currentEditabilityMap = currentWeek
      ? await this.availabilitySlotEditabilityService.calculateEditability({
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
      ? await this.availabilitySlotEditabilityService.calculateEditability({
          practitionerId: input.practitionerId,
          weekStartDate: window.nextWeek.startDate,
          weekEndDate: window.nextWeek.endDate,
          timezone: nextWeek.timezone,
          slots: nextWeek.slots,
          isArchived: nextWeek.status === 'ARCHIVED',
          now,
        })
      : undefined;

    return this.availabilityWeekMapper.toOverview({
      timezone: input.timezone,
      currentWeek: currentWeek ?? null,
      nextWeek: nextWeek ?? null,
      currentWeekRange: window.currentWeek,
      nextWeekRange: window.nextWeek,
      currentEditabilityMap,
      nextEditabilityMap,
      now,
    });
  }
}
