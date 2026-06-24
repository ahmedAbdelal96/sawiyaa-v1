import { Injectable, NotFoundException } from '@nestjs/common';
import { PresenceMapper } from '../mappers/presence.mapper';
import { PresencePractitionerRepository } from '../repositories/presence-practitioner.repository';
import { PractitionerPresenceRepository } from '../repositories/practitioner-presence.repository';
import { PresencePublicExposureService } from '../services/presence-public-exposure.service';

/**
 * Public presence read is intentionally minimal and safe.
 * It exposes current live-state indicators only for practitioners already allowed on public surfaces.
 */
@Injectable()
export class GetPublicPractitionerPresenceUseCase {
  constructor(
    private readonly presencePractitionerRepository: PresencePractitionerRepository,
    private readonly practitionerPresenceRepository: PractitionerPresenceRepository,
    private readonly presencePublicExposureService: PresencePublicExposureService,
    private readonly presenceMapper: PresenceMapper,
  ) {}

  async execute(input: { slug: string }) {
    const practitioner =
      await this.presencePractitionerRepository.findByPublicSlug(input.slug);

    if (!practitioner) {
      throw new NotFoundException({
        messageKey: 'presence.errors.publicPresenceNotFound',
        error: 'PUBLIC_PRESENCE_NOT_FOUND',
      });
    }

    this.presencePublicExposureService.assertVisible(practitioner);

    const presence =
      await this.practitionerPresenceRepository.getByPractitionerProfileId(
        practitioner.id,
      );

    return {
      presence: this.presenceMapper.toPublicViewModel(
        this.presencePublicExposureService.sanitizeForPublic(presence),
      ),
    };
  }
}
