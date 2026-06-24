import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
import { SessionReminderQueueRepository } from './repositories/session-reminder-queue.repository';
import { GetAdminAuditEventDetailsUseCase } from './use-cases/get-admin-audit-event-details.use-case';
import { ListAdminAuditEventsUseCase } from './use-cases/list-admin-audit-events.use-case';
import { ListAdminOperationalNotificationsUseCase } from './use-cases/list-admin-operational-notifications.use-case';
import { GetAdminOperationalNotificationDetailsUseCase } from './use-cases/get-admin-operational-notification-details.use-case';
import { ListMyNotificationsUseCase } from './use-cases/list-my-notifications.use-case';
import { GetMyUnreadNotificationCountUseCase } from './use-cases/get-my-unread-notification-count.use-case';
import { ListMyNotificationDevicesUseCase } from './use-cases/list-my-notification-devices.use-case';
import { MarkAllMyNotificationsReadUseCase } from './use-cases/mark-all-my-notifications-read.use-case';
import { MarkMyNotificationReadUseCase } from './use-cases/mark-my-notification-read.use-case';
import { SendDevTestPushNotificationUseCase } from './use-cases/send-dev-test-push-notification.use-case';
import { RegisterNotificationDeviceUseCase } from './use-cases/register-notification-device.use-case';
import { RevokeNotificationDeviceUseCase } from './use-cases/revoke-notification-device.use-case';
import { NotificationContextEnrichmentService } from './services/notification-context-enrichment.service';
import { EMAIL_PROVIDER } from './providers/email-provider.token';
import { EmailProviderAdapter } from './providers/email-provider.adapter';
import { SmtpEmailProvider } from './providers/smtp-email.provider';
import { BrevoEmailProvider } from './providers/brevo-email.provider';

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

    // --- Email provider adapter factory ---
    // Selects the concrete provider based on notification.mail.provider.
    // Fails fast at startup if provider=brevo but BREVO_API_KEY is missing.
    {
      provide: EMAIL_PROVIDER,
      useFactory: (configService: ConfigService): EmailProviderAdapter => {
        const provider =
          configService
            .get<string>('notification.mail.provider')
            ?.toLowerCase()
            .trim() ?? 'smtp';

        if (provider === 'brevo') {
          const apiKey = configService
            .get<string>('notification.brevo.apiKey')
            ?.trim();
          if (!apiKey) {
            throw new Error(
              '[NotificationsModule] MAIL_PROVIDER=brevo requires BREVO_API_KEY to be set',
            );
          }
          // BrevoEmailProvider is stateless — construct directly without DI
          return new BrevoEmailProvider(configService);
        }

        // Default to SMTP
        return new SmtpEmailProvider(configService);
      },
      inject: [ConfigService],
    },

    // --- Concrete providers (used by the factory above) ---
    SmtpEmailProvider,
    BrevoEmailProvider,

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
    NotificationContextEnrichmentService,
    NotificationIntentWriterService,
    AdminAuditPresenter,
    SessionReminderQueueRepository,
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
    SendDevTestPushNotificationUseCase,
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
    SessionReminderQueueRepository,
  ],
})
export class NotificationsModule {}
