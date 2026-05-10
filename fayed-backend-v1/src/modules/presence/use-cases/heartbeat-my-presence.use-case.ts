import { Injectable, NotFoundException } from '@nestjs/common';
import { I18nService } from '@common/i18n/services/i18n.service';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { PresenceMapper } from '../mappers/presence.mapper';
import { PresencePractitionerRepository } from '../repositories/presence-practitioner.repository';
import { PractitionerPresenceRepository } from '../repositories/practitioner-presence.repository';

/**
 * Heartbeat is the live-activity write for practitioner presence.
 * It keeps freshness timestamps warm and can bootstrap a seeded/offline row to ONLINE
 * when the practitioner app is actually active, while still respecting explicit manual OFFLINE.
 */
@Injectable()
export class HeartbeatMyPresenceUseCase {
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

    const presence = await this.practitionerPresenceRepository.touchHeartbeat(
      practitioner.id,
    );

    return {
      message: this.i18nService.t(
        'presence.success.heartbeatRecorded',
        input.locale,
      ),
      presence: this.presenceMapper.toViewModel(presence),
    };
  }
}
