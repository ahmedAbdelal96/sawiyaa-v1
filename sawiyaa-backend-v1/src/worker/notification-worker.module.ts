import { Module } from '@nestjs/common';
import { ConfigModule as EnvConfigModule, ConfigService } from '@nestjs/config';
import { validate } from '@config/validation/env.schema';
import appConfig from '@config/app.config';
import notificationConfig from '@config/notification.config';
import notificationQueueConfig from '@config/notification-queue.config';
import { PrismaModule } from '@common/prisma/prisma.module';
import { NotificationQueueModule } from '@common/queue/notification-queue.module';
import { EMAIL_PROVIDER } from '@modules/notifications/providers/email-provider.token';
import { EmailProviderAdapter } from '@modules/notifications/providers/email-provider.adapter';
import { SmtpEmailProvider } from '@modules/notifications/providers/smtp-email.provider';
import { BrevoEmailProvider } from '@modules/notifications/providers/brevo-email.provider';
import { createNotificationEmailProvider } from '@modules/notifications/providers/email-provider.factory';
import { NotificationDeviceRepository } from '@modules/notifications/repositories/notification-device.repository';
import { OperationalNotificationRepository } from '@modules/notifications/repositories/operational-notification.repository';
import { NotificationChannelExecutionService } from '@modules/notifications/services/notification-channel-execution.service';
import { NotificationDeliveryAttemptEngineService } from '@modules/notifications/services/notification-delivery-attempt-engine.service';
import { NotificationDomainValidityGuardService } from '@modules/notifications/services/notification-domain-validity-guard.service';
import { NotificationEmailService } from '@modules/notifications/services/notification-email.service';
import { NotificationLifecycleService } from '@modules/notifications/services/notification-lifecycle.service';
import { NotificationPushExecutionService } from '@modules/notifications/services/notification-push-execution.service';
import { NotificationRealtimePublisher } from '@modules/notifications/services/notification-realtime.publisher';
import { NotificationRetryPolicyService } from '@modules/notifications/services/notification-retry-policy.service';
import { NotificationSchedulerCoreService } from '@modules/notifications/services/notification-scheduler-core.service';
import { NotificationQueueWorkerService } from './notification-worker.service';

@Module({
  imports: [
    EnvConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validate,
      load: [appConfig, notificationConfig, notificationQueueConfig],
    }),
    PrismaModule,
    NotificationQueueModule,
  ],
  providers: [
    {
      provide: EMAIL_PROVIDER,
      useFactory: createNotificationEmailProvider,
      inject: [ConfigService],
    },
    SmtpEmailProvider,
    BrevoEmailProvider,
    NotificationDeviceRepository,
    OperationalNotificationRepository,
    NotificationChannelExecutionService,
    NotificationDeliveryAttemptEngineService,
    NotificationDomainValidityGuardService,
    NotificationEmailService,
    NotificationLifecycleService,
    NotificationPushExecutionService,
    NotificationRealtimePublisher,
    NotificationRetryPolicyService,
    NotificationSchedulerCoreService,
    NotificationQueueWorkerService,
  ],
})
export class NotificationWorkerModule {}
