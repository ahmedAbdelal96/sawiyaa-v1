import { Injectable, NotFoundException } from '@nestjs/common';
import { I18nService } from '@common/i18n/services/i18n.service';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { PresenceMapper } from '../mappers/presence.mapper';
import { PresencePractitionerRepository } from '../repositories/presence-practitioner.repository';
import { PractitionerPresenceRepository } from '../repositories/practitioner-presence.repository';

/**
 * Instant-booking readiness is stored independently from generic status.
 * This keeps later instant-booking policy decisions explicit instead of implicit in presence transitions.
 */
@Injectable()
export class SetMyInstantBookingAvailabilityUseCase {
  constructor(
    private readonly i18nService: I18nService,
    private readonly presencePractitionerRepository: PresencePractitionerRepository,
    private readonly practitionerPresenceRepository: PractitionerPresenceRepository,
    private readonly presenceMapper: PresenceMapper,
  ) {}

  async execute(input: {
    userId: string;
    locale: SupportedLocale;
    isInstantBookingEnabled: boolean;
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

    const presence =
      await this.practitionerPresenceRepository.updateInstantBookingEnabled(
        practitioner.id,
        input.isInstantBookingEnabled,
      );

    return {
      message: this.i18nService.t(
        'presence.success.instantBookingUpdated',
        input.locale,
      ),
      presence: this.presenceMapper.toViewModel(presence),
    };
  }
}
