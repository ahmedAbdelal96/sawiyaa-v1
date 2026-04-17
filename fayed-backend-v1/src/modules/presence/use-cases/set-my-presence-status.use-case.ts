import { Injectable, NotFoundException } from '@nestjs/common';
import { PresenceStatus } from '@prisma/client';
import { I18nService } from '@common/i18n/services/i18n.service';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { PresenceMapper } from '../mappers/presence.mapper';
import { PresencePractitionerRepository } from '../repositories/presence-practitioner.repository';
import { PractitionerPresenceRepository } from '../repositories/practitioner-presence.repository';

/**
 * Manual status changes stay explicit and easy to reason about.
 * Later Sessions module may set BUSY programmatically, but this use case remains the practitioner-owned manual path.
 */
@Injectable()
export class SetMyPresenceStatusUseCase {
  constructor(
    private readonly i18nService: I18nService,
    private readonly presencePractitionerRepository: PresencePractitionerRepository,
    private readonly practitionerPresenceRepository: PractitionerPresenceRepository,
    private readonly presenceMapper: PresenceMapper,
  ) {}

  async execute(input: {
    userId: string;
    locale: SupportedLocale;
    status: PresenceStatus;
  }) {
    const practitioner = await this.presencePractitionerRepository.findByUserId(
      input.userId,
    );

    if (!practitioner) {
      throw new NotFoundException({
        messageKey: 'presence.errors.practitionerNotFound',
        error: 'PRESENCE_PRACTITIONER_NOT_FOUND',
      });
    }

    const presence = await this.practitionerPresenceRepository.updateStatus(
      practitioner.id,
      input.status,
    );

    return {
      message: this.i18nService.t('presence.success.statusUpdated', input.locale),
      presence: this.presenceMapper.toViewModel(presence),
    };
  }
}
