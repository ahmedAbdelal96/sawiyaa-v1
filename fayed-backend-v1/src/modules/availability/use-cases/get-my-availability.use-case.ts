import { Injectable, NotFoundException } from '@nestjs/common';
import { I18nService } from '@common/i18n/services/i18n.service';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { AvailabilityMapper } from '../mappers/availability.mapper';
import { AvailabilityExceptionRepository } from '../repositories/availability-exception.repository';
import { AvailabilityPractitionerRepository } from '../repositories/availability-practitioner.repository';
import { AvailabilitySlotRepository } from '../repositories/availability-slot.repository';
import { ResolvePractitionerTimezoneService } from '../services/resolve-practitioner-timezone.service';

/**
 * Self-service read model for the authenticated practitioner's schedule state.
 * GET stays side-effect free and never auto-creates schedule records.
 */
@Injectable()
export class GetMyAvailabilityUseCase {
  constructor(
    private readonly i18nService: I18nService,
    private readonly availabilityPractitionerRepository: AvailabilityPractitionerRepository,
    private readonly availabilitySlotRepository: AvailabilitySlotRepository,
    private readonly availabilityExceptionRepository: AvailabilityExceptionRepository,
    private readonly resolvePractitionerTimezoneService: ResolvePractitionerTimezoneService,
    private readonly availabilityMapper: AvailabilityMapper,
  ) {}

  async execute(input: { userId: string; locale: SupportedLocale }) {
    const practitioner = await this.availabilityPractitionerRepository.findByUserId(
      input.userId,
    );

    if (!practitioner) {
      throw new NotFoundException({
        messageKey: 'availability.errors.practitionerNotFound',
        error: 'AVAILABILITY_PRACTITIONER_NOT_FOUND',
      });
    }

    const [weeklySlots, exceptions] = await Promise.all([
      this.availabilitySlotRepository.listActiveByPractitioner(practitioner.id),
      this.availabilityExceptionRepository.listUpcomingActiveByPractitioner(
        practitioner.id,
        new Date(),
      ),
    ]);

    const timezone = this.resolvePractitionerTimezoneService.resolve({
      weeklySlots,
      fallbackTimezone: practitioner.user.timezone,
    });

    return {
      message: this.i18nService.t(
        'availability.success.myAvailabilityFetched',
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
