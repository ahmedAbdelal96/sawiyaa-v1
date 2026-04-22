import { Injectable, NotFoundException } from '@nestjs/common';
import { AvailabilityExceptionType } from '@prisma/client';
import { I18nService } from '@common/i18n/services/i18n.service';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { AvailabilityMapper } from '../mappers/availability.mapper';
import { AvailabilityExceptionRepository } from '../repositories/availability-exception.repository';
import { AvailabilityPractitionerRepository } from '../repositories/availability-practitioner.repository';
import { AvailabilitySlotRepository } from '../repositories/availability-slot.repository';
import { ResolvePractitionerTimezoneService } from '../services/resolve-practitioner-timezone.service';
import { ValidateAvailabilityOverlapService } from '../services/validate-availability-overlap.service';

/**
 * Exception creation handles temporary overrides only.
 * It deliberately does not infer presence/busy state or create any reservation/session objects.
 */
@Injectable()
export class CreateAvailabilityExceptionUseCase {
  constructor(
    private readonly i18nService: I18nService,
    private readonly availabilityPractitionerRepository: AvailabilityPractitionerRepository,
    private readonly availabilitySlotRepository: AvailabilitySlotRepository,
    private readonly availabilityExceptionRepository: AvailabilityExceptionRepository,
    private readonly availabilityMapper: AvailabilityMapper,
    private readonly resolvePractitionerTimezoneService: ResolvePractitionerTimezoneService,
    private readonly validateAvailabilityOverlapService: ValidateAvailabilityOverlapService,
  ) {}

  async execute(input: {
    userId: string;
    locale: SupportedLocale;
    type: AvailabilityExceptionType;
    startsAtUtc: Date;
    endsAtUtc: Date;
    reason?: string;
  }) {
    const practitioner =
      await this.availabilityPractitionerRepository.findByUserId(input.userId);

    if (!practitioner) {
      throw new NotFoundException({
        messageKey: 'availability.errors.practitionerNotFound',
        error: 'AVAILABILITY_PRACTITIONER_NOT_FOUND',
      });
    }

    this.validateAvailabilityOverlapService.validateExceptionRange(
      input.startsAtUtc,
      input.endsAtUtc,
    );

    await this.availabilityExceptionRepository.createException(
      practitioner.id,
      {
        type: input.type,
        startsAtUtc: input.startsAtUtc,
        endsAtUtc: input.endsAtUtc,
        reason: input.reason?.trim() || null,
      },
    );

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
        'availability.success.exceptionCreated',
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
