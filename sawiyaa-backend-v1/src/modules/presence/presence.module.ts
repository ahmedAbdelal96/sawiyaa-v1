import { Module } from '@nestjs/common';
import { JwtAccessAuthGuard } from '@common/guards/authentication/jwt-access-auth.guard';
import { RolesGuard } from '@common/guards/authorization/roles.guard';
import { PublicPractitionerVisibilityPolicy } from '@modules/practitioners/policies/public-practitioner-visibility.policy';
import { PractitionerPresenceController } from './controllers/practitioner-presence.controller';
import { PublicPractitionerPresenceController } from './controllers/public-practitioner-presence.controller';
import { PresenceMapper } from './mappers/presence.mapper';
import { PresencePractitionerRepository } from './repositories/presence-practitioner.repository';
import { PractitionerPresenceRepository } from './repositories/practitioner-presence.repository';
import { PresencePublicExposureService } from './services/presence-public-exposure.service';
import { GetMyPresenceUseCase } from './use-cases/get-my-presence.use-case';
import { GetPublicPractitionerPresenceUseCase } from './use-cases/get-public-practitioner-presence.use-case';
import { HeartbeatMyPresenceUseCase } from './use-cases/heartbeat-my-presence.use-case';
import { SetMyInstantBookingAvailabilityUseCase } from './use-cases/set-my-instant-booking-availability.use-case';
import { SetMyPresenceStatusUseCase } from './use-cases/set-my-presence-status.use-case';

/**
 * Presence Module owns only the practitioner's current live state and instant-booking readiness flag.
 * Availability, sessions, and booking orchestration remain in separate modules.
 */
@Module({
  controllers: [
    PractitionerPresenceController,
    PublicPractitionerPresenceController,
  ],
  providers: [
    JwtAccessAuthGuard,
    RolesGuard,
    PublicPractitionerVisibilityPolicy,
    PresenceMapper,
    PresencePractitionerRepository,
    PractitionerPresenceRepository,
    PresencePublicExposureService,
    GetMyPresenceUseCase,
    SetMyPresenceStatusUseCase,
    SetMyInstantBookingAvailabilityUseCase,
    HeartbeatMyPresenceUseCase,
    GetPublicPractitionerPresenceUseCase,
  ],
  exports: [PractitionerPresenceRepository],
})
export class PresenceModule {}
