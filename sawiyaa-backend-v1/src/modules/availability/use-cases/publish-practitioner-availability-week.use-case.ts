import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { I18nService } from '@common/i18n/services/i18n.service';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { AvailabilityWeekStatus } from '@prisma/client';
import { AvailabilityPractitionerRepository } from '../repositories/availability-practitioner.repository';
import {
  PractitionerAvailabilityWeekRepository,
  PractitionerAvailabilityWeekWithSlots,
} from '../repositories/practitioner-availability-week.repository';
import { AvailabilityWeekMapper } from '../mappers/availability-week.mapper';
import { AvailabilityWeekOverviewService } from '../services/availability-week-overview.service';
import { assertIanaTimeZoneInput } from '@common/utils/timezone.util';
import { AvailabilityWeekCalendarService } from '../services/availability-week-calendar.service';
import { assertWeeklySlotsHaveValidLocalTimes } from '../utils/availability-local-time.util';

@Injectable()
export class PublishPractitionerAvailabilityWeekUseCase {
  constructor(
    private readonly availabilityWeekRepository: PractitionerAvailabilityWeekRepository,
    private readonly availabilityPractitionerRepository: AvailabilityPractitionerRepository,
    private readonly availabilityWeekOverviewService: AvailabilityWeekOverviewService,
    private readonly availabilityWeekMapper: AvailabilityWeekMapper,
    private readonly i18nService: I18nService,
    private readonly availabilityWeekCalendarService: AvailabilityWeekCalendarService,
  ) {}

  async execute(input: {
    userId: string;
    locale: SupportedLocale;
    weekId: string;
  }) {
    const practitioner =
      await this.availabilityPractitionerRepository.findByUserId(input.userId);

    if (!practitioner) {
      throw new NotFoundException({
        messageKey: 'availability.errors.practitionerNotFound',
        errorCode: 'AVAILABILITY_PRACTITIONER_NOT_FOUND',
      });
    }

    const week = await this.availabilityWeekRepository.findByIdForPractitioner(
      practitioner.id,
      input.weekId,
    );

    if (!week) {
      throw new NotFoundException({
        messageKey: 'availability.errors.weekNotFound',
        errorCode: 'AVAILABILITY_WEEK_NOT_FOUND',
      });
    }

    const practitionerTimezone = assertIanaTimeZoneInput(practitioner.user.timezone, {
      messageKey: 'availability.errors.timezoneRequired',
      error: 'AVAILABILITY_TIMEZONE_REQUIRED',
    });
    assertIanaTimeZoneInput(week.timezone, {
      messageKey: 'availability.errors.invalidTimezone',
      error: 'AVAILABILITY_INVALID_TIMEZONE',
    });
    this.availabilityWeekCalendarService.assertWeekInsideActiveWindow({
      weekStartDate: week.weekStartDate,
      timezone: practitionerTimezone,
    });

    if (week.status !== AvailabilityWeekStatus.DRAFT) {
      throw new ConflictException({
        messageKey: 'availability.errors.weekNotDraft',
        errorCode: 'AVAILABILITY_WEEK_NOT_DRAFT',
      });
    }

    if (week.slots.length === 0) {
      throw new BadRequestException({
        messageKey: 'availability.errors.weekNotPublishable',
        errorCode: 'AVAILABILITY_WEEK_NOT_PUBLISHABLE',
      });
    }

    assertWeeklySlotsHaveValidLocalTimes({
      weekStartDate: week.weekStartDate,
      timezone: week.timezone,
      slots: week.slots.map((slot) => ({
        dayOfWeek: this.toDayOfWeek(slot.weekday),
        startMinuteOfDay: slot.startMinuteOfDay,
        endMinuteOfDay: slot.endMinuteOfDay,
      })),
    });

    const published = await this.availabilityWeekRepository.publishWeek(week.id);
    const overview = await this.availabilityWeekOverviewService.buildForPractitioner(
      {
        practitionerId: practitioner.id,
        timezone: week.timezone,
      },
    );

      return {
        message: this.i18nService.t(
          'availability.success.weekPublished',
          input.locale,
        ),
      week: this.availabilityWeekMapper.toWeek({
        week: published as PractitionerAvailabilityWeekWithSlots,
        weekStartDate: week.weekStartDate,
        weekEndDate: week.weekEndDate,
        timezone: week.timezone,
      }),
      weekStartsOn: overview.weekStartsOn,
      futureWeeksAllowed: overview.futureWeeksAllowed,
      activeRange: overview.activeRange,
      weeks: overview.weeks,
    };
  }

  private toDayOfWeek(weekday: import('@prisma/client').AvailabilityWeekday): number {
    return [
      'SUNDAY',
      'MONDAY',
      'TUESDAY',
      'WEDNESDAY',
      'THURSDAY',
      'FRIDAY',
      'SATURDAY',
    ].indexOf(weekday);
  }
}
