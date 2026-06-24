import { Injectable, NotFoundException } from '@nestjs/common';
import { PublicPractitionerVisibilityPolicy } from '@modules/practitioners/policies/public-practitioner-visibility.policy';
import { AvailabilityMapper } from '../mappers/availability.mapper';
import { AvailabilityPractitionerRepository } from '../repositories/availability-practitioner.repository';
import { AvailabilitySlotRepository } from '../repositories/availability-slot.repository';
import { ResolvePractitionerTimezoneService } from '../services/resolve-practitioner-timezone.service';

/**
 * Public weekly availability summary is safe for profile pages.
 * It intentionally excludes private exception reasons and any booking/session runtime state.
 */
@Injectable()
export class GetPublicPractitionerAvailabilityUseCase {
  constructor(
    private readonly availabilityPractitionerRepository: AvailabilityPractitionerRepository,
    private readonly availabilitySlotRepository: AvailabilitySlotRepository,
    private readonly availabilityMapper: AvailabilityMapper,
    private readonly resolvePractitionerTimezoneService: ResolvePractitionerTimezoneService,
    private readonly publicPractitionerVisibilityPolicy: PublicPractitionerVisibilityPolicy,
  ) {}

  async execute(input: { slug: string }) {
    const practitioner =
      await this.availabilityPractitionerRepository.findByPublicSlug(
        input.slug,
      );

    if (!practitioner) {
      throw new NotFoundException({
        messageKey: 'availability.errors.publicAvailabilityNotFound',
        error: 'PUBLIC_AVAILABILITY_NOT_FOUND',
      });
    }

    const weeklySlots =
      await this.availabilitySlotRepository.listActiveByPractitioner(
        practitioner.id,
      );

    const visibility = this.publicPractitionerVisibilityPolicy.evaluate({
      practitionerStatus: practitioner.status,
      userStatus: practitioner.user.status,
      isPublicProfilePublished: practitioner.isPublicProfilePublished,
      hasPublicSlug: Boolean(practitioner.publicSlug?.trim()),
      hasDisplayName: Boolean(practitioner.user.displayName?.trim()),
      hasProfessionalTitle: Boolean(practitioner.professionalTitle?.trim()),
      hasBio: Boolean(practitioner.bio?.trim()),
      hasAtLeastOneActiveSpecialty: practitioner.specialties.length > 0,
    });

    if (!visibility.isVisible) {
      throw new NotFoundException({
        messageKey: 'availability.errors.publicAvailabilityNotFound',
        error: 'PUBLIC_AVAILABILITY_NOT_VISIBLE',
      });
    }

    const timezone = this.resolvePractitionerTimezoneService.resolve({
      weeklySlots,
      fallbackTimezone: practitioner.user.timezone,
    });

    return {
      timezone,
      weeklySlots: weeklySlots.map((slot) =>
        this.availabilityMapper.toWeeklySlot(slot),
      ),
    };
  }
}
