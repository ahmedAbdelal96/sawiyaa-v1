import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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
 * Exception updates stay explicit and practitioner-owned.
 * This keeps admin/system overrides free to evolve later without mixing responsibilities.
 */
@Injectable()
export class UpdateAvailabilityExceptionUseCase {
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
    exceptionId: string;
    type?: AvailabilityExceptionType;
    startsAtUtc?: Date;
    endsAtUtc?: Date;
    reason?: string | null;
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

    const startsAtUtc = input.startsAtUtc ?? existing.startsAtUtc;
    const endsAtUtc = input.endsAtUtc ?? existing.endsAtUtc;
    this.validateAvailabilityOverlapService.validateExceptionRange(
      startsAtUtc,
      endsAtUtc,
    );

    const updateResult = await this.availabilityExceptionRepository.updateException(
      practitioner.id,
      input.exceptionId,
      {
        type: input.type ?? existing.type,
        startsAtUtc,
        endsAtUtc,
        reason:
          input.reason === undefined ? existing.reason : input.reason?.trim() || null,
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
        'availability.success.exceptionUpdated',
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
