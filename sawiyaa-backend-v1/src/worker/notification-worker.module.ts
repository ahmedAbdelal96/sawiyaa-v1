import { Module } from '@nestjs/common';
import { ConfigModule as EnvConfigModule, ConfigService } from '@nestjs/config';
import { validate } from '@config/validation/env.schema';
import appConfig from '@config/app.config';
import notificationConfig from '@config/notification.config';
import notificationQueueConfig from '@config/notification-queue.config';
import operationsQueueConfig from '@config/operations-queue.config';
import { PrismaModule } from '@common/prisma/prisma.module';
import { NotificationQueueModule } from '@common/queue/notification-queue.module';
import { OperationsQueueModule } from '@common/queue/operations-queue.module';
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
import { DailyAttendanceQueueWorkerService } from './daily-attendance-worker.service';
import { SessionCodeGeneratorService } from '@modules/sessions/services/session-code-generator.service';
import { SessionRepository } from '@modules/sessions/repositories/session.repository';
import { NormalizeSessionAttendanceReconciliationService } from '@modules/sessions/services/normalize-session-attendance-reconciliation.service';
import { DailySessionAttendanceReconciliationAdapter } from '@modules/sessions/providers/daily-session-attendance-reconciliation.adapter';
import { SESSION_ATTENDANCE_RECONCILIATION_PROVIDER } from '@modules/sessions/providers/session-attendance-reconciliation.tokens';
import { ReconcileSessionAttendanceUseCase } from '@modules/sessions/use-cases/reconcile-session-attendance.use-case';
import videoConfig from '@config/video.config';

@Module({
  imports: [
    EnvConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validate,
      load: [
        appConfig,
        notificationConfig,
        notificationQueueConfig,
        operationsQueueConfig,
        videoConfig,
      ],
    }),
    PrismaModule,
    NotificationQueueModule,
    OperationsQueueModule,
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
    SessionCodeGeneratorService,
    SessionRepository,
    NormalizeSessionAttendanceReconciliationService,
    DailySessionAttendanceReconciliationAdapter,
    {
      provide: SESSION_ATTENDANCE_RECONCILIATION_PROVIDER,
      useExisting: DailySessionAttendanceReconciliationAdapter,
    },
    ReconcileSessionAttendanceUseCase,
    DailyAttendanceQueueWorkerService,
  ],
})
export class NotificationWorkerModule {}
