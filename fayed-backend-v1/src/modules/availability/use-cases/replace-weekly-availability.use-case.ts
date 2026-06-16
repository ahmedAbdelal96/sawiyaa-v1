import { Injectable, NotFoundException } from '@nestjs/common';
import { I18nService } from '@common/i18n/services/i18n.service';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { AvailabilityMapper } from '../mappers/availability.mapper';
import { AvailabilityExceptionRepository } from '../repositories/availability-exception.repository';
import { AvailabilityPractitionerRepository } from '../repositories/availability-practitioner.repository';
import { AvailabilitySlotRepository } from '../repositories/availability-slot.repository';
import { ValidateAvailabilityOverlapService } from '../services/validate-availability-overlap.service';
import { assertIanaTimeZoneInput } from '@common/utils/timezone.util';
import { WEEKDAY_INDEX_TO_ENUM } from '../utils/availability-weekday.util';
import { WeeklyAvailabilitySlotDraftInput } from '../types/availability.types';

/**
 * Weekly schedule replacement is a full deterministic write.
 * This avoids patch-merging complexities and leaves a clean baseline for later booking-slot generation.
 */
@Injectable()
export class ReplaceWeeklyAvailabilityUseCase {
  constructor(
    private readonly i18nService: I18nService,
    private readonly availabilityPractitionerRepository: AvailabilityPractitionerRepository,
    private readonly availabilitySlotRepository: AvailabilitySlotRepository,
    private readonly availabilityExceptionRepository: AvailabilityExceptionRepository,
    private readonly availabilityMapper: AvailabilityMapper,
    private readonly validateAvailabilityOverlapService: ValidateAvailabilityOverlapService,
  ) {}

  async execute(input: {
    userId: string;
    locale: SupportedLocale;
    timezone: string;
    slots: WeeklyAvailabilitySlotDraftInput[];
  }) {
    const practitioner =
      await this.availabilityPractitionerRepository.findByUserId(input.userId);

    if (!practitioner) {
      throw new NotFoundException({
        messageKey: 'availability.errors.practitionerNotFound',
        error: 'AVAILABILITY_PRACTITIONER_NOT_FOUND',
      });
    }

    const timezone = assertIanaTimeZoneInput(input.timezone, {
      messageKey: 'availability.errors.invalidTimezone',
      error: 'AVAILABILITY_INVALID_TIMEZONE',
    });
    const normalizedSlots =
      this.validateAvailabilityOverlapService.validateWeeklySlots(input.slots);

    const weeklySlots =
      await this.availabilitySlotRepository.replaceWeeklySlots(
        practitioner.id,
        timezone,
        normalizedSlots.map((slot) => ({
          weekday: WEEKDAY_INDEX_TO_ENUM[slot.dayOfWeek],
          durationMinutes: slot.durationMinutes,
          startMinuteOfDay: slot.startMinuteOfDay,
          endMinuteOfDay: slot.endMinuteOfDay,
        })),
      );

    const exceptions =
      await this.availabilityExceptionRepository.listUpcomingActiveByPractitioner(
        practitioner.id,
        new Date(),
      );

    return {
      message: this.i18nService.t(
        'availability.success.weeklyAvailabilityReplaced',
        input.locale,
      ),
      ...this.availabilityMapper.toCombinedViewModel({
        timezone,
        weeklySlots,
        exceptions,
      }),
    };
  }
}
