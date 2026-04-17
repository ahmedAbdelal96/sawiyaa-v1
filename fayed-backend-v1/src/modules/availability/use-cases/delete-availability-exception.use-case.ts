import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { I18nService } from '@common/i18n/services/i18n.service';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { AvailabilityMapper } from '../mappers/availability.mapper';
import { AvailabilityExceptionRepository } from '../repositories/availability-exception.repository';
import { AvailabilityPractitionerRepository } from '../repositories/availability-practitioner.repository';
import { AvailabilitySlotRepository } from '../repositories/availability-slot.repository';
import { ResolvePractitionerTimezoneService } from '../services/resolve-practitioner-timezone.service';

/**
 * Delete in Availability V1 means soft-deactivate the exception.
 * This preserves a minimal audit trail without adding a dedicated history module yet.
 */
@Injectable()
export class DeleteAvailabilityExceptionUseCase {
  constructor(
    private readonly i18nService: I18nService,
    private readonly availabilityPractitionerRepository: AvailabilityPractitionerRepository,
    private readonly availabilitySlotRepository: AvailabilitySlotRepository,
    private readonly availabilityExceptionRepository: AvailabilityExceptionRepository,
    private readonly availabilityMapper: AvailabilityMapper,
    private readonly resolvePractitionerTimezoneService: ResolvePractitionerTimezoneService,
  ) {}

  async execute(input: {
    userId: string;
    locale: SupportedLocale;
    exceptionId: string;
  }) {
    const practitioner = await this.availabilityPractitionerRepository.findByUserId(
      input.userId,
    );

    if (!practitioner) {
      throw new NotFoundException({
        messageKey: 'availability.errors.practitionerNotFound',
        error: 'AVAILABILITY_PRACTITIONER_NOT_FOUND',
      });
    }

    const existing =
      await this.availabilityExceptionRepository.findActiveByIdForPractitioner(
        practitioner.id,
        input.exceptionId,
      );

    if (!existing) {
      throw new NotFoundException({
        messageKey: 'availability.errors.exceptionNotFound',
        error: 'AVAILABILITY_EXCEPTION_NOT_FOUND',
      });
    }

    const updateResult = await this.availabilityExceptionRepository.updateException(
      practitioner.id,
      input.exceptionId,
      {
        isActive: false,
      },
    );

    if (updateResult.count === 0) {
      throw new BadRequestException({
        messageKey: 'availability.errors.exceptionNotFound',
        error: 'AVAILABILITY_EXCEPTION_NOT_MUTABLE',
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
        'availability.success.exceptionDeleted',
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
