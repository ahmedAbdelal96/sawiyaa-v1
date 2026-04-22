import { Module } from '@nestjs/common';
import { RolesGuard } from '@common/guards/authorization/roles.guard';
import { AdminAuditLogController } from './controllers/admin-audit-log.controller';
import { AdminNotificationOpsController } from './controllers/admin-notification-ops.controller';
import { AdminAuditPresenter } from './presenters/admin-audit.presenter';
import { NotificationEmailService } from './services/notification-email.service';
import { OperationalNotificationRepository } from './repositories/operational-notification.repository';
import { NotificationLifecycleService } from './services/notification-lifecycle.service';
import { NotificationSchedulerCoreService } from './services/notification-scheduler-core.service';
import { OperationalNotificationService } from './services/operational-notification.service';
import { NotificationChannelExecutionService } from './services/notification-channel-execution.service';
import { NotificationDeliveryAttemptEngineService } from './services/notification-delivery-attempt-engine.service';
import { NotificationRetryPolicyService } from './services/notification-retry-policy.service';
import { NotificationDomainValidityGuardService } from './services/notification-domain-validity-guard.service';
import { NotificationOpsPresenter } from './presenters/notification-ops.presenter';
import { GetAdminAuditEventDetailsUseCase } from './use-cases/get-admin-audit-event-details.use-case';
import { ListAdminAuditEventsUseCase } from './use-cases/list-admin-audit-events.use-case';
import { ListAdminOperationalNotificationsUseCase } from './use-cases/list-admin-operational-notifications.use-case';
import { GetAdminOperationalNotificationDetailsUseCase } from './use-cases/get-admin-operational-notification-details.use-case';

/**
 * Notifications module provides delivery helpers for OTP and other alerts.
 * It is intentionally minimal in Phase 1 and focuses on SMTP email for dev testing.
 */
@Module({
  controllers: [AdminNotificationOpsController, AdminAuditLogController],
  providers: [
    RolesGuard,
    NotificationEmailService,
    OperationalNotificationRepository,
    NotificationLifecycleService,
    NotificationSchedulerCoreService,
    NotificationChannelExecutionService,
    NotificationRetryPolicyService,
    NotificationDomainValidityGuardService,
    NotificationOpsPresenter,
    AdminAuditPresenter,
    ListAdminAuditEventsUseCase,
    GetAdminAuditEventDetailsUseCase,
    ListAdminOperationalNotificationsUseCase,
    GetAdminOperationalNotificationDetailsUseCase,
    NotificationDeliveryAttemptEngineService,
    OperationalNotificationService,
  ],
  exports: [
    NotificationEmailService,
    NotificationSchedulerCoreService,
    NotificationDeliveryAttemptEngineService,
    OperationalNotificationService,
  ],
})
export class NotificationsModule {}
