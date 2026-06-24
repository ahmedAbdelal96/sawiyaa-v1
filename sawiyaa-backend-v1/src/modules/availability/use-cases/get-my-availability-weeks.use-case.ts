import { Injectable, NotFoundException } from '@nestjs/common';
import { I18nService } from '@common/i18n/services/i18n.service';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { AvailabilityPractitionerRepository } from '../repositories/availability-practitioner.repository';
import { AvailabilityWeekOverviewService } from '../services/availability-week-overview.service';

@Injectable()
export class GetMyAvailabilityWeeksUseCase {
  constructor(
    private readonly i18nService: I18nService,
    private readonly availabilityPractitionerRepository: AvailabilityPractitionerRepository,
    private readonly availabilityWeekOverviewService: AvailabilityWeekOverviewService,
  ) {}

  async execute(input: { userId: string; locale: SupportedLocale }) {
    const practitioner =
      await this.availabilityPractitionerRepository.findByUserId(input.userId);

    if (!practitioner) {
      throw new NotFoundException({
        messageKey: 'availability.errors.practitionerNotFound',
        errorCode: 'AVAILABILITY_PRACTITIONER_NOT_FOUND',
      });
    }

    const timezone = practitioner.user.timezone ?? 'UTC';
    const overview = await this.availabilityWeekOverviewService.buildForPractitioner(
      {
        practitionerId: practitioner.id,
        timezone,
      },
    );

    return {
      message: this.i18nService.t(
        'availability.success.weeksFetched',
        input.locale,
      ),
      ...overview,
    };
  }
}
