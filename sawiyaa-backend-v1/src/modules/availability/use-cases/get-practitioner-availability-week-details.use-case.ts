import { Injectable, NotFoundException } from '@nestjs/common';
import { I18nService } from '@common/i18n/services/i18n.service';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { assertIanaTimeZoneInput } from '@common/utils/timezone.util';
import { AvailabilityPractitionerRepository } from '../repositories/availability-practitioner.repository';
import { PractitionerAvailabilityWeekRepository } from '../repositories/practitioner-availability-week.repository';
import { AvailabilityWeekCalendarService } from '../services/availability-week-calendar.service';
import { AvailabilitySlotEditabilityService } from '../services/availability-slot-editability.service';
import { AvailabilityWeekMapper } from '../mappers/availability-week.mapper';

@Injectable()
export class GetPractitionerAvailabilityWeekDetailsUseCase {
  constructor(
    private readonly i18nService: I18nService,
    private readonly availabilityPractitionerRepository: AvailabilityPractitionerRepository,
    private readonly availabilityWeekRepository: PractitionerAvailabilityWeekRepository,
    private readonly availabilityWeekCalendarService: AvailabilityWeekCalendarService,
    private readonly availabilitySlotEditabilityService: AvailabilitySlotEditabilityService,
    private readonly availabilityWeekMapper: AvailabilityWeekMapper,
  ) {}

  async execute(input: { userId: string; weekId: string; locale: SupportedLocale }) {
    const practitioner = await this.availabilityPractitionerRepository.findByUserId(input.userId);
    if (!practitioner) {
      throw new NotFoundException({ messageKey: 'availability.errors.practitionerNotFound', errorCode: 'AVAILABILITY_PRACTITIONER_NOT_FOUND' });
    }

    const timezone = assertIanaTimeZoneInput(practitioner.user.timezone, {
      messageKey: 'availability.errors.timezoneRequired',
      error: 'AVAILABILITY_TIMEZONE_REQUIRED',
    });
    const week = await this.availabilityWeekRepository.findByIdForPractitioner(practitioner.id, input.weekId);
    if (!week) {
      throw new NotFoundException({ messageKey: 'availability.errors.weekNotFound', errorCode: 'AVAILABILITY_WEEK_NOT_FOUND' });
    }

    const range = this.availabilityWeekCalendarService.getWeekRangeByStartDate({ weekStartDate: week.weekStartDate.toISOString().slice(0, 10) });
    this.availabilityWeekCalendarService.assertWeekInsideActiveWindow({ weekStartDate: range.startDate, timezone });
    const editability = await this.availabilitySlotEditabilityService.calculateEditability({
      practitionerId: practitioner.id,
      weekStartDate: range.startDate,
      weekEndDate: range.endDate,
      timezone: week.timezone,
      slots: week.slots,
    });
    const mappedWeek = this.availabilityWeekMapper.toWeek({
      week,
      weekStartDate: range.startDate,
      weekEndDate: range.endDate,
      timezone: week.timezone,
      editabilityMap: editability,
    });
    const counts = {
      slotCount30Minutes: week.slots.filter((slot) => slot.durationMinutes === 30).length,
      slotCount60Minutes: week.slots.filter((slot) => slot.durationMinutes === 60).length,
    };

    return {
      message: this.i18nService.t('availability.success.weekDetailsFetched', input.locale),
      week: mappedWeek,
      canPublish: week.status === 'DRAFT' && week.slots.length > 0,
      containsBookings: Array.from(editability.values()).some((slot) => slot.isBookedOrReserved),
      ...counts,
    };
  }
}
