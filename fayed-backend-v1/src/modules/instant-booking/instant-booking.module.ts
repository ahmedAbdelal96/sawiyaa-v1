import { Module } from '@nestjs/common';
import { JwtAccessAuthGuard } from '@common/guards/authentication/jwt-access-auth.guard';
import { RolesGuard } from '@common/guards/authorization/roles.guard';
import { AvailabilityModule } from '@modules/availability/availability.module';
import { NotificationsModule } from '@modules/notifications/notifications.module';
import { PresenceModule } from '@modules/presence/presence.module';
import { PublicPractitionerVisibilityPolicy } from '@modules/practitioners/policies/public-practitioner-visibility.policy';
import { SessionsModule } from '@modules/sessions/sessions.module';
import { PatientInstantBookingDiscoveryController } from './controllers/patient-instant-booking-discovery.controller';
import { PatientInstantBookingController } from './controllers/patient-instant-booking.controller';
import { PractitionerInstantBookingController } from './controllers/practitioner-instant-booking.controller';
import { InstantBookingMapper } from './mappers/instant-booking.mapper';
import { InstantBookingPatientRepository } from './repositories/instant-booking-patient.repository';
import { InstantBookingPractitionerRepository } from './repositories/instant-booking-practitioner.repository';
import { InstantBookingRequestRepository } from './repositories/instant-booking-request.repository';
import { CreateSessionFromInstantBookingService } from './services/create-session-from-instant-booking.service';
import { InstantBookingExpirySweeperService } from './services/instant-booking-expiry-sweeper.service';
import { ValidateInstantBookingEligibilityService } from './services/validate-instant-booking-eligibility.service';
import { ValidateInstantBookingStatusTransitionService } from './services/validate-instant-booking-status-transition.service';
import { AcceptInstantBookingRequestUseCase } from './use-cases/accept-instant-booking-request.use-case';
import { CancelInstantBookingRequestUseCase } from './use-cases/cancel-instant-booking-request.use-case';
import { CreateInstantBookingRequestUseCase } from './use-cases/create-instant-booking-request.use-case';
import { ExpireInstantBookingRequestUseCase } from './use-cases/expire-instant-booking-request.use-case';
import { GetPatientInstantBookingRequestUseCase } from './use-cases/get-patient-instant-booking-request.use-case';
import { ListPatientInstantBookingPractitionersUseCase } from './use-cases/list-patient-instant-booking-practitioners.use-case';
import { ListPatientInstantBookingRequestsUseCase } from './use-cases/list-patient-instant-booking-requests.use-case';
import { ListPractitionerInstantBookingRequestsUseCase } from './use-cases/list-practitioner-instant-booking-requests.use-case';
import { ListPractitionerPendingInstantBookingRequestsUseCase } from './use-cases/list-practitioner-pending-instant-booking-requests.use-case';
import { RejectInstantBookingRequestUseCase } from './use-cases/reject-instant-booking-request.use-case';

/**
 * Instant Booking Module owns only the immediate request/decision lifecycle.
 * Session creation happens as a handoff so Session remains the actual booking source of truth.
 */
@Module({
  imports: [AvailabilityModule, NotificationsModule, PresenceModule, SessionsModule],
  controllers: [
    PatientInstantBookingDiscoveryController,
    PatientInstantBookingController,
    PractitionerInstantBookingController,
  ],
  providers: [
    JwtAccessAuthGuard,
    RolesGuard,
    PublicPractitionerVisibilityPolicy,
    InstantBookingMapper,
    InstantBookingPatientRepository,
    InstantBookingPractitionerRepository,
    InstantBookingRequestRepository,
    ValidateInstantBookingStatusTransitionService,
    ValidateInstantBookingEligibilityService,
    CreateSessionFromInstantBookingService,
    InstantBookingExpirySweeperService,
    CreateInstantBookingRequestUseCase,
    GetPatientInstantBookingRequestUseCase,
    ListPatientInstantBookingPractitionersUseCase,
    ListPatientInstantBookingRequestsUseCase,
    ListPractitionerInstantBookingRequestsUseCase,
    CancelInstantBookingRequestUseCase,
    ListPractitionerPendingInstantBookingRequestsUseCase,
    AcceptInstantBookingRequestUseCase,
    RejectInstantBookingRequestUseCase,
    ExpireInstantBookingRequestUseCase,
  ],
  exports: [
    ExpireInstantBookingRequestUseCase,
    InstantBookingRequestRepository,
  ],
})
export class InstantBookingModule {}
