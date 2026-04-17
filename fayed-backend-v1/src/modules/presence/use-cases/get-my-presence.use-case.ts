import { Injectable, NotFoundException } from '@nestjs/common';
import { I18nService } from '@common/i18n/services/i18n.service';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { PresenceMapper } from '../mappers/presence.mapper';
import { PresencePractitionerRepository } from '../repositories/presence-practitioner.repository';
import { PractitionerPresenceRepository } from '../repositories/practitioner-presence.repository';

/**
 * Self-service read model for the authenticated practitioner's current live state.
 * GET is side-effect free and returns an offline default view if no record exists yet.
 */
@Injectable()
export class GetMyPresenceUseCase {
  constructor(
    private readonly i18nService: I18nService,
    private readonly presencePractitionerRepository: PresencePractitionerRepository,
    private readonly practitionerPresenceRepository: PractitionerPresenceRepository,
    private readonly presenceMapper: PresenceMapper,
  ) {}

  async execute(input: { userId: string; locale: SupportedLocale }) {
    const practitioner = await this.presencePractitionerRepository.findByUserId(
      input.userId,
    );

    if (!practitioner) {
      throw new NotFoundException({
        messageKey: 'presence.errors.practitionerNotFound',
        error: 'PRESENCE_PRACTITIONER_NOT_FOUND',
      });
    }

    const presence =
      await this.practitionerPresenceRepository.getByPractitionerProfileId(
        practitioner.id,
      );

    return {
      message: this.i18nService.t('presence.success.presenceFetched', input.locale),
      presence: this.presenceMapper.toViewModel(presence),
    };
  }
}
