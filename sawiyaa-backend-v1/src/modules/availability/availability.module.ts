import { Module } from '@nestjs/common';
import { JwtAccessAuthGuard } from '@common/guards/authentication/jwt-access-auth.guard';
import { RolesGuard } from '@common/guards/authorization/roles.guard';
import { PublicPractitionerVisibilityPolicy } from '@modules/practitioners/policies/public-practitioner-visibility.policy';
import { PractitionerAvailabilityWeeksController } from './controllers/practitioner-availability-weeks.controller';
import { PublicPractitionerAvailabilityController } from './controllers/public-practitioner-availability.controller';
import { AvailabilityWeekMapper } from './mappers/availability-week.mapper';
import { AvailabilityExceptionRepository } from './repositories/availability-exception.repository';
import { AvailabilityPractitionerRepository } from './repositories/availability-practitioner.repository';
import { PractitionerAvailabilityWeekRepository } from './repositories/practitioner-availability-week.repository';
import { BuildPublishedWeekAvailabilityWindowsService } from './services/build-published-week-availability-windows.service';
import { AvailabilityWeekCalendarService } from './services/availability-week-calendar.service';
import { AvailabilityWeekOverviewService } from './services/availability-week-overview.service';
import { ResolvePractitionerTimezoneService } from './services/resolve-practitioner-timezone.service';
import { ValidateAvailabilitySessionConflictsService } from './services/validate-availability-session-conflicts.service';
import { ValidateAvailabilityOverlapService } from './services/validate-availability-overlap.service';
import { AvailabilitySlotEditabilityService } from './services/availability-slot-editability.service';
import { CopyPractitionerAvailabilityWeekToNextUseCase } from './use-cases/copy-practitioner-availability-week-to-next.use-case';
import { CreatePractitionerAvailabilityWeekUseCase } from './use-cases/create-practitioner-availability-week.use-case';
import { GetMyAvailabilityWeeksUseCase } from './use-cases/get-my-availability-weeks.use-case';
import { ListPublicPractitionerAvailabilityWindowsUseCase } from './use-cases/list-public-practitioner-availability-windows.use-case';
import { PublishPractitionerAvailabilityWeekUseCase } from './use-cases/publish-practitioner-availability-week.use-case';
import { UpdatePractitionerAvailabilityWeekUseCase } from './use-cases/update-practitioner-availability-week.use-case';

/**
 * Availability Module owns recurring schedule + exceptions only.
 * Presence, sessions, instant booking, and payment orchestration are intentionally left to separate modules.
 */
@Module({
  controllers: [
    PractitionerAvailabilityWeeksController,
    PublicPractitionerAvailabilityController,
  ],
  providers: [
    JwtAccessAuthGuard,
    RolesGuard,
    PublicPractitionerVisibilityPolicy,
    AvailabilityWeekMapper,
    AvailabilityPractitionerRepository,
    PractitionerAvailabilityWeekRepository,
    AvailabilityExceptionRepository,
    ValidateAvailabilityOverlapService,
    AvailabilitySlotEditabilityService,
    ValidateAvailabilitySessionConflictsService,
    ResolvePractitionerTimezoneService,
    BuildPublishedWeekAvailabilityWindowsService,
    AvailabilityWeekCalendarService,
    AvailabilityWeekOverviewService,
    GetMyAvailabilityWeeksUseCase,
    CreatePractitionerAvailabilityWeekUseCase,
    UpdatePractitionerAvailabilityWeekUseCase,
    CopyPractitionerAvailabilityWeekToNextUseCase,
    PublishPractitionerAvailabilityWeekUseCase,
    ListPublicPractitionerAvailabilityWindowsUseCase,
  ],
  exports: [
    AvailabilityPractitionerRepository,
    AvailabilityExceptionRepository,
    PractitionerAvailabilityWeekRepository,
    ResolvePractitionerTimezoneService,
    BuildPublishedWeekAvailabilityWindowsService,
    AvailabilityWeekCalendarService,
  ],
})
export class AvailabilityModule {}
