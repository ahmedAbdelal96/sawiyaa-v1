import { Module } from '@nestjs/common';
import { JwtAccessAuthGuard } from '@common/guards/authentication/jwt-access-auth.guard';
import { RolesGuard } from '@common/guards/authorization/roles.guard';
import { PublicPractitionerVisibilityPolicy } from '@modules/practitioners/policies/public-practitioner-visibility.policy';
import { PractitionerAvailabilityController } from './controllers/practitioner-availability.controller';
import { PublicPractitionerAvailabilityController } from './controllers/public-practitioner-availability.controller';
import { AvailabilityMapper } from './mappers/availability.mapper';
import { AvailabilityExceptionRepository } from './repositories/availability-exception.repository';
import { AvailabilityPractitionerRepository } from './repositories/availability-practitioner.repository';
import { AvailabilitySlotRepository } from './repositories/availability-slot.repository';
import { BuildAvailabilityWindowsService } from './services/build-availability-windows.service';
import { ResolvePractitionerTimezoneService } from './services/resolve-practitioner-timezone.service';
import { ValidateAvailabilityOverlapService } from './services/validate-availability-overlap.service';
import { CreateAvailabilityExceptionUseCase } from './use-cases/create-availability-exception.use-case';
import { DeleteAvailabilityExceptionUseCase } from './use-cases/delete-availability-exception.use-case';
import { GetMyAvailabilityUseCase } from './use-cases/get-my-availability.use-case';
import { GetPublicPractitionerAvailabilityUseCase } from './use-cases/get-public-practitioner-availability.use-case';
import { ListPublicPractitionerAvailabilityWindowsUseCase } from './use-cases/list-public-practitioner-availability-windows.use-case';
import { ReplaceWeeklyAvailabilityUseCase } from './use-cases/replace-weekly-availability.use-case';
import { UpdateAvailabilityExceptionUseCase } from './use-cases/update-availability-exception.use-case';

/**
 * Availability Module owns recurring schedule + exceptions only.
 * Presence, sessions, instant booking, and payment orchestration are intentionally left to separate modules.
 */
@Module({
  controllers: [
    PractitionerAvailabilityController,
    PublicPractitionerAvailabilityController,
  ],
  providers: [
    JwtAccessAuthGuard,
    RolesGuard,
    PublicPractitionerVisibilityPolicy,
    AvailabilityMapper,
    AvailabilityPractitionerRepository,
    AvailabilitySlotRepository,
    AvailabilityExceptionRepository,
    ValidateAvailabilityOverlapService,
    ResolvePractitionerTimezoneService,
    BuildAvailabilityWindowsService,
    GetMyAvailabilityUseCase,
    ReplaceWeeklyAvailabilityUseCase,
    CreateAvailabilityExceptionUseCase,
    UpdateAvailabilityExceptionUseCase,
    DeleteAvailabilityExceptionUseCase,
    GetPublicPractitionerAvailabilityUseCase,
    ListPublicPractitionerAvailabilityWindowsUseCase,
  ],
  exports: [
    AvailabilityPractitionerRepository,
    AvailabilitySlotRepository,
    AvailabilityExceptionRepository,
    ResolvePractitionerTimezoneService,
    BuildAvailabilityWindowsService,
  ],
})
export class AvailabilityModule {}
