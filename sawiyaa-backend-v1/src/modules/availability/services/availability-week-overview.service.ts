import { Injectable } from '@nestjs/common';
import { AvailabilityWeekMapper } from '../mappers/availability-week.mapper';
import { PractitionerAvailabilityWeekRepository } from '../repositories/practitioner-availability-week.repository';
import { AvailabilityWeekCalendarService } from './availability-week-calendar.service';
import { AvailabilityWeekOverviewViewModel } from '../types/availability-week.types';

@Injectable()
export class AvailabilityWeekOverviewService {
  constructor(
    private readonly availabilityWeekRepository: PractitionerAvailabilityWeekRepository,
    private readonly availabilityWeekCalendarService: AvailabilityWeekCalendarService,
    private readonly availabilityWeekMapper: AvailabilityWeekMapper,
  ) {}

  async buildForPractitioner(input: {
    practitionerId: string;
    timezone: string;
    now?: Date;
  }): Promise<AvailabilityWeekOverviewViewModel> {
    const window = this.availabilityWeekCalendarService.resolveCurrentAndNextWeekWindow(
      {
        timezone: input.timezone,
        now: input.now,
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

    return this.availabilityWeekMapper.toOverview({
      timezone: input.timezone,
      currentWeek: currentWeek ?? null,
      nextWeek: nextWeek ?? null,
      currentWeekRange: window.currentWeek,
      nextWeekRange: window.nextWeek,
      now: input.now,
    });
  }
}
