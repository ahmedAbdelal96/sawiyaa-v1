import { forwardRef, Module } from '@nestjs/common';
import { JwtAccessAuthGuard } from '@common/guards/authentication/jwt-access-auth.guard';
import { PermissionResolverService } from '@common/guards/authorization/permission-resolver.service';
import { PermissionsGuard } from '@common/guards/authorization/permissions.guard';
import { RolesGuard } from '@common/guards/authorization/roles.guard';
import { AvailabilityModule } from '@modules/availability/availability.module';
import { ReviewsModule } from '@modules/reviews/reviews.module';
import { CustomerWalletsModule } from '@modules/customer-wallets/customer-wallets.module';
import { FinancialOperationsModule } from '@modules/financial-operations/financial-operations.module';
import { NotificationsModule } from '@modules/notifications/notifications.module';
import { ConfigModule } from '@modules/config/config.module';
import { ChatModule } from '@modules/chat/chat.module';
import { PaymentsModule } from '@modules/payments/payments.module';
import { PublicPractitionerVisibilityPolicy } from '@modules/practitioners/policies/public-practitioner-visibility.policy';
import { PractitionersModule } from '@modules/practitioners/practitioners.module';
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
import { ApplyManualNoShowFinancialEffectsService } from './services/apply-manual-no-show-financial-effects.service';
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
import { CloseSessionVideoRoomByPractitionerUseCase } from './use-cases/close-session-video-room-by-practitioner.use-case';
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
import { MarkSessionNoShowByPractitionerUseCase } from './use-cases/mark-session-no-show-by-practitioner.use-case';
import { PrepareSessionRuntimeUseCase } from './use-cases/prepare-session-runtime.use-case';
import { ResolveSessionJoinContractUseCase } from './use-cases/resolve-session-join-contract.use-case';
import { GetSessionCancellationPoliciesUseCase } from './use-cases/get-session-cancellation-policies.use-case';
import { UpdateSessionCancellationPolicyUseCase } from './use-cases/update-session-cancellation-policy.use-case';
import { CreateAdminSessionManualDecisionUseCase } from './use-cases/create-admin-session-manual-decision.use-case';
import { CreateAdminSessionPackageEntitlementDecisionUseCase } from './use-cases/create-admin-session-package-entitlement-decision.use-case';
import { ListAdminSessionManualDecisionsUseCase } from './use-cases/list-admin-session-manual-decisions.use-case';
import { ResolvePatientSessionActionsService } from './services/resolve-patient-session-actions.service';
import { SessionLifecycleService } from './services/session-lifecycle.service';
import { SessionCompletionConfirmationSweeperService } from './services/session-completion-confirmation-sweeper.service';
import { SessionCodeGeneratorService } from './services/session-code-generator.service';
import { NormalizeDailyAttendanceEvidenceService } from './services/normalize-daily-attendance-evidence.service';
import { MarkSessionInProgressFromAttendanceService } from './services/mark-session-in-progress-from-attendance.service';
import { SessionOutcomeEvaluator } from './services/session-outcome-evaluator.service';
import { SessionOutcomePolicySnapshotService } from './services/session-outcome-policy-snapshot.service';
import { NormalizeSessionAttendanceReconciliationService } from './services/normalize-session-attendance-reconciliation.service';
import { DailySessionAttendanceReconciliationAdapter } from './providers/daily-session-attendance-reconciliation.adapter';
import { SESSION_ATTENDANCE_RECONCILIATION_PROVIDER } from './providers/session-attendance-reconciliation.tokens';
import { ReconcileSessionAttendanceUseCase } from './use-cases/reconcile-session-attendance.use-case';
import { SessionAttendanceReconciliationSweeperService } from './services/session-attendance-reconciliation-sweeper.service';
import { CompleteSessionTransactionService } from './services/complete-session-transaction.service';
import { AdminSessionResolutionService } from './services/admin-session-resolution.service';
import { AdminSessionResolutionPolicyService } from './services/admin-session-resolution-policy.service';
import { MySessionController } from './controllers/my-session.controller';
import { GetMyNextSessionUseCase } from './use-cases/get-my-next-session.use-case';
import { SessionJoinBootstrapController } from './controllers/session-join-bootstrap.controller';
import { RescheduleSessionService } from './services/reschedule-session.service';
import { ParticipantSessionOutcomeBoundaryService } from './services/participant-session-outcome-boundary.service';
import { SessionOperationalInterpreterService } from './services/session-operational-interpreter.service';
import { ResolvePractitionerSessionCommandActionsService } from './services/resolve-practitioner-session-command-actions.service';

/**
 * Sessions Module is the operational source of truth for scheduled consultations.
 * It consumes availability and visibility policies without taking ownership of schedule, presence, payments, or video providers.
 */
@Module({
  imports: [
    AvailabilityModule,
    ReviewsModule,
    NotificationsModule,
    CustomerWalletsModule,
    FinancialOperationsModule,
    forwardRef(() => PaymentsModule),
    ConfigModule,
    ChatModule,
    PractitionersModule,
  ],
  controllers: [
    PatientSessionsController,
    PractitionerSessionsController,
    AdminSessionsOperationsController,
    SessionAttendanceWebhooksController,
    MySessionController,
    SessionJoinBootstrapController,
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
    SessionCodeGeneratorService,
    SessionCancellationPolicyRepository,
    SessionPatientRepository,
    SessionPractitionerRepository,
    ValidateSessionDurationService,
    ValidateSessionBookingRequestService,
    ValidateSessionStatusTransitionService,
    SessionLifecycleService,
    ParticipantSessionOutcomeBoundaryService,
    SessionCompletionConfirmationSweeperService,
    ValidateSessionCancellationPolicyRulesService,
    EvaluateSessionCancellationPolicyService,
    ResolvePatientSessionActionsService,
    SessionOperationalInterpreterService,
    ResolvePractitionerSessionCommandActionsService,
    ApplySessionCancellationFinancialEffectsService,
    ApplyManualNoShowFinancialEffectsService,
    ExpireUnpaidSessionSweeperService,
    ResolveSessionJoinReadinessService,
    ParseDailyAttendanceWebhookService,
    DailySessionVideoProviderAdapter,
    SessionVideoProviderRegistryService,
    SessionVideoProviderResolverService,
    ValidateSessionScheduleCompatibilityService,
    ValidateSessionConflictsService,
    CreateScheduledSessionUseCase,
    CloseSessionVideoRoomByPractitionerUseCase,
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
    MarkSessionNoShowByPractitionerUseCase,
    PrepareSessionRuntimeUseCase,
    ResolveSessionJoinContractUseCase,
    GetSessionCancellationPoliciesUseCase,
    UpdateSessionCancellationPolicyUseCase,
    CreateAdminSessionManualDecisionUseCase,
    CreateAdminSessionPackageEntitlementDecisionUseCase,
    ListAdminSessionManualDecisionsUseCase,
    CancelSessionUseCase,
    ExpireUnpaidSessionUseCase,
    SessionJoinAvailableNotificationSweeperService,
    SessionReminderNotificationSweeperService,
    NormalizeDailyAttendanceEvidenceService,
    MarkSessionInProgressFromAttendanceService,
    SessionOutcomeEvaluator,
    SessionOutcomePolicySnapshotService,
    NormalizeSessionAttendanceReconciliationService,
    DailySessionAttendanceReconciliationAdapter,
    {
      provide: SESSION_ATTENDANCE_RECONCILIATION_PROVIDER,
      useExisting: DailySessionAttendanceReconciliationAdapter,
    },
    ReconcileSessionAttendanceUseCase,
    RescheduleSessionService,
    SessionAttendanceReconciliationSweeperService,
    CompleteSessionTransactionService,
    AdminSessionResolutionService,
    AdminSessionResolutionPolicyService,
    GetMyNextSessionUseCase,
    RescheduleSessionService,
  ],
  exports: [
    SessionRepository,
    ValidateSessionDurationService,
    ValidateSessionBookingRequestService,
    ValidateSessionScheduleCompatibilityService,
    ValidateSessionConflictsService,
    ValidateSessionStatusTransitionService,
    SessionLifecycleService,
    SessionOperationalInterpreterService,
    ExpireUnpaidSessionUseCase,
    ReconcileSessionAttendanceUseCase,
  ],
})
export class SessionsModule {}
