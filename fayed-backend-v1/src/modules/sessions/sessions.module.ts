import { forwardRef, Module } from '@nestjs/common';
import { JwtAccessAuthGuard } from '@common/guards/authentication/jwt-access-auth.guard';
import { PermissionResolverService } from '@common/guards/authorization/permission-resolver.service';
import { PermissionsGuard } from '@common/guards/authorization/permissions.guard';
import { RolesGuard } from '@common/guards/authorization/roles.guard';
import { AvailabilityModule } from '@modules/availability/availability.module';
import { CustomerWalletsModule } from '@modules/customer-wallets/customer-wallets.module';
import { FinancialOperationsModule } from '@modules/financial-operations/financial-operations.module';
import { NotificationsModule } from '@modules/notifications/notifications.module';
import { PaymentsModule } from '@modules/payments/payments.module';
import { PublicPractitionerVisibilityPolicy } from '@modules/practitioners/policies/public-practitioner-visibility.policy';
import { AdminSessionsOperationsController } from './controllers/admin-sessions-operations.controller';
import { PatientSessionsController } from './controllers/patient-sessions.controller';
import { PractitionerSessionsController } from './controllers/practitioner-sessions.controller';
import { SessionAttendanceWebhooksController } from './controllers/session-attendance-webhooks.controller';
import { SessionMapper } from './mappers/session.mapper';
import { DailySessionVideoProviderAdapter } from './providers/daily-session-video-provider.adapter';
import { SessionPatientRepository } from './repositories/session-patient.repository';
import { SessionPractitionerRepository } from './repositories/session-practitioner.repository';
import { SessionRepository } from './repositories/session.repository';
import { SessionCancellationPolicyRepository } from './repositories/session-cancellation-policy.repository';
import { ApplySessionCancellationFinancialEffectsService } from './services/apply-session-cancellation-financial-effects.service';
import { EvaluateSessionCancellationPolicyService } from './services/evaluate-session-cancellation-policy.service';
import { ResolveSessionJoinReadinessService } from './services/resolve-session-join-readiness.service';
import { SessionJoinAvailableNotificationSweeperService } from './services/session-join-available-notification-sweeper.service';
import { SessionReminderNotificationSweeperService } from './services/session-reminder-notification-sweeper.service';
import { ParseDailyAttendanceWebhookService } from './services/parse-daily-attendance-webhook.service';
import { SessionVideoProviderRegistryService } from './services/session-video-provider-registry.service';
import { SessionVideoProviderResolverService } from './services/session-video-provider-resolver.service';
import { ValidateSessionBookingRequestService } from './services/validate-session-booking-request.service';
import { ValidateSessionConflictsService } from './services/validate-session-conflicts.service';
import { ValidateSessionDurationService } from './services/validate-session-duration.service';
import { ValidateSessionScheduleCompatibilityService } from './services/validate-session-schedule-compatibility.service';
import { ValidateSessionStatusTransitionService } from './services/validate-session-status-transition.service';
import { ValidateSessionCancellationPolicyRulesService } from './services/validate-session-cancellation-policy-rules.service';
import { SessionAccessPolicy } from './policies/session-access.policy';
import { ExpireUnpaidSessionSweeperService } from './services/expire-unpaid-session-sweeper.service';
import { CancelSessionUseCase } from './use-cases/cancel-session.use-case';
import { CreateScheduledSessionUseCase } from './use-cases/create-scheduled-session.use-case';
import { ExpireUnpaidSessionUseCase } from './use-cases/expire-unpaid-session.use-case';
import { GetMyPatientSessionsUseCase } from './use-cases/get-my-patient-sessions.use-case';
import { GetMyPatientSessionSummaryUseCase } from './use-cases/get-my-patient-session-summary.use-case';
import { GetMyPractitionerSessionsUseCase } from './use-cases/get-my-practitioner-sessions.use-case';
import { GetMyPractitionerSessionSummaryUseCase } from './use-cases/get-my-practitioner-session-summary.use-case';
import { GetAdminSessionAttendanceUseCase } from './use-cases/get-admin-session-attendance.use-case';
import { GetAdminSessionsUseCase } from './use-cases/get-admin-sessions.use-case';
import { GetSessionDetailsUseCase } from './use-cases/get-session-details.use-case';
import { PreviewSessionCancellationUseCase } from './use-cases/preview-session-cancellation.use-case';
import { InspectAdminSessionRuntimeUseCase } from './use-cases/inspect-admin-session-runtime.use-case';
import { HandleDailyAttendanceWebhookUseCase } from './use-cases/handle-daily-attendance-webhook.use-case';
import { MarkSessionCompletedByPractitionerUseCase } from './use-cases/mark-session-completed-by-practitioner.use-case';
import { MarkSessionNoShowByPractitionerUseCase } from './use-cases/mark-session-no-show-by-practitioner.use-case';
import { PrepareSessionRuntimeUseCase } from './use-cases/prepare-session-runtime.use-case';
import { ResolveSessionJoinContractUseCase } from './use-cases/resolve-session-join-contract.use-case';
import { GetSessionCancellationPoliciesUseCase } from './use-cases/get-session-cancellation-policies.use-case';
import { UpdateSessionCancellationPolicyUseCase } from './use-cases/update-session-cancellation-policy.use-case';

/**
 * Sessions Module is the operational source of truth for scheduled consultations.
 * It consumes availability and visibility policies without taking ownership of schedule, presence, payments, or video providers.
 */
@Module({
  imports: [
    AvailabilityModule,
    NotificationsModule,
    CustomerWalletsModule,
    FinancialOperationsModule,
    forwardRef(() => PaymentsModule),
  ],
  controllers: [
    PatientSessionsController,
    PractitionerSessionsController,
    AdminSessionsOperationsController,
    SessionAttendanceWebhooksController,
  ],
  providers: [
    JwtAccessAuthGuard,
    PermissionsGuard,
    RolesGuard,
    PermissionResolverService,
    SessionAccessPolicy,
    PublicPractitionerVisibilityPolicy,
    SessionMapper,
    SessionRepository,
    SessionCancellationPolicyRepository,
    SessionPatientRepository,
    SessionPractitionerRepository,
    ValidateSessionDurationService,
    ValidateSessionBookingRequestService,
    ValidateSessionStatusTransitionService,
    ValidateSessionCancellationPolicyRulesService,
    EvaluateSessionCancellationPolicyService,
    ApplySessionCancellationFinancialEffectsService,
    ExpireUnpaidSessionSweeperService,
    ResolveSessionJoinReadinessService,
    ParseDailyAttendanceWebhookService,
    DailySessionVideoProviderAdapter,
    SessionVideoProviderRegistryService,
    SessionVideoProviderResolverService,
    ValidateSessionScheduleCompatibilityService,
    ValidateSessionConflictsService,
    CreateScheduledSessionUseCase,
    GetMyPatientSessionsUseCase,
    GetMyPatientSessionSummaryUseCase,
    GetMyPractitionerSessionsUseCase,
    GetMyPractitionerSessionSummaryUseCase,
    GetAdminSessionsUseCase,
    GetAdminSessionAttendanceUseCase,
    GetSessionDetailsUseCase,
    PreviewSessionCancellationUseCase,
    InspectAdminSessionRuntimeUseCase,
    HandleDailyAttendanceWebhookUseCase,
    MarkSessionCompletedByPractitionerUseCase,
    MarkSessionNoShowByPractitionerUseCase,
    PrepareSessionRuntimeUseCase,
    ResolveSessionJoinContractUseCase,
    GetSessionCancellationPoliciesUseCase,
    UpdateSessionCancellationPolicyUseCase,
    CancelSessionUseCase,
    ExpireUnpaidSessionUseCase,
    SessionJoinAvailableNotificationSweeperService,
    SessionReminderNotificationSweeperService,
  ],
  exports: [
    SessionRepository,
    ValidateSessionDurationService,
    ValidateSessionBookingRequestService,
    ValidateSessionScheduleCompatibilityService,
    ValidateSessionConflictsService,
    ValidateSessionStatusTransitionService,
    ExpireUnpaidSessionUseCase,
  ],
})
export class SessionsModule {}
