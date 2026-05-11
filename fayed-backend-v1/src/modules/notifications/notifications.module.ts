import { Module } from '@nestjs/common';
import { PermissionResolverService } from '@common/guards/authorization/permission-resolver.service';
import { PermissionsGuard } from '@common/guards/authorization/permissions.guard';
import { RolesGuard } from '@common/guards/authorization/roles.guard';
import { AdminAuditLogController } from './controllers/admin-audit-log.controller';
import { AdminNotificationOpsController } from './controllers/admin-notification-ops.controller';
import { NotificationDevicesController } from './controllers/notification-devices.controller';
import { UserNotificationsController } from './controllers/user-notifications.controller';
import { AdminAuditPresenter } from './presenters/admin-audit.presenter';
import { NotificationEmailService } from './services/notification-email.service';
import { NotificationPushExecutionService } from './services/notification-push-execution.service';
import { NotificationDeviceRepository } from './repositories/notification-device.repository';
import { OperationalNotificationRepository } from './repositories/operational-notification.repository';
import { UserNotificationRepository } from './repositories/user-notification.repository';
import { NotificationLifecycleService } from './services/notification-lifecycle.service';
import { NotificationSchedulerCoreService } from './services/notification-scheduler-core.service';
import { NotificationDeliveryRunnerService } from './services/notification-delivery-runner.service';
import { OperationalNotificationService } from './services/operational-notification.service';
import { NotificationChannelExecutionService } from './services/notification-channel-execution.service';
import { NotificationDeliveryAttemptEngineService } from './services/notification-delivery-attempt-engine.service';
import { NotificationRetryPolicyService } from './services/notification-retry-policy.service';
import { NotificationDomainValidityGuardService } from './services/notification-domain-validity-guard.service';
import { NotificationOpsPresenter } from './presenters/notification-ops.presenter';
import { UserNotificationsPresenter } from './presenters/user-notifications.presenter';
import { NotificationIntentWriterService } from './services/notification-intent-writer.service';
import { GetAdminAuditEventDetailsUseCase } from './use-cases/get-admin-audit-event-details.use-case';
import { ListAdminAuditEventsUseCase } from './use-cases/list-admin-audit-events.use-case';
import { ListAdminOperationalNotificationsUseCase } from './use-cases/list-admin-operational-notifications.use-case';
import { GetAdminOperationalNotificationDetailsUseCase } from './use-cases/get-admin-operational-notification-details.use-case';
import { ListMyNotificationsUseCase } from './use-cases/list-my-notifications.use-case';
import { GetMyUnreadNotificationCountUseCase } from './use-cases/get-my-unread-notification-count.use-case';
import { ListMyNotificationDevicesUseCase } from './use-cases/list-my-notification-devices.use-case';
import { MarkAllMyNotificationsReadUseCase } from './use-cases/mark-all-my-notifications-read.use-case';
import { MarkMyNotificationReadUseCase } from './use-cases/mark-my-notification-read.use-case';
import { RegisterNotificationDeviceUseCase } from './use-cases/register-notification-device.use-case';
import { RevokeNotificationDeviceUseCase } from './use-cases/revoke-notification-device.use-case';

/**
 * Notifications module provides the operational notification stack and the authenticated in-app feed.
 */
@Module({
  controllers: [
    AdminNotificationOpsController,
    AdminAuditLogController,
    UserNotificationsController,
    NotificationDevicesController,
  ],
  providers: [
    RolesGuard,
    PermissionsGuard,
    PermissionResolverService,
    NotificationEmailService,
    NotificationPushExecutionService,
    NotificationDeviceRepository,
    OperationalNotificationRepository,
    UserNotificationRepository,
    NotificationLifecycleService,
    NotificationSchedulerCoreService,
    NotificationDeliveryRunnerService,
    NotificationChannelExecutionService,
    NotificationRetryPolicyService,
    NotificationDomainValidityGuardService,
    NotificationOpsPresenter,
    UserNotificationsPresenter,
    NotificationIntentWriterService,
    AdminAuditPresenter,
    ListAdminAuditEventsUseCase,
    GetAdminAuditEventDetailsUseCase,
    ListAdminOperationalNotificationsUseCase,
    GetAdminOperationalNotificationDetailsUseCase,
    NotificationDeliveryAttemptEngineService,
    OperationalNotificationService,
    ListMyNotificationsUseCase,
    GetMyUnreadNotificationCountUseCase,
    MarkAllMyNotificationsReadUseCase,
    MarkMyNotificationReadUseCase,
    RegisterNotificationDeviceUseCase,
    RevokeNotificationDeviceUseCase,
    ListMyNotificationDevicesUseCase,
  ],
  exports: [
    NotificationEmailService,
    NotificationSchedulerCoreService,
    NotificationDeliveryRunnerService,
    NotificationDeliveryAttemptEngineService,
    OperationalNotificationService,
    NotificationIntentWriterService,
  ],
})
export class NotificationsModule {}
