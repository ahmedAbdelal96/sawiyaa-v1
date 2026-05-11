import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule as EnvConfigModule } from '@nestjs/config';
import { validate } from './config/validation/env.schema';
import appConfig from './config/app.config';
import databaseConfig from './config/database.config';
import authConfig from './config/auth.config';
import paymentConfig from './config/payment.config';
import videoConfig from './config/video.config';
import notificationConfig from './config/notification.config';
import moduleConfig from './config/module.config';
import loggingConfig from './config/logging.config';
import sessionConfig from './config/session.config';
import { I18nModule } from './common/i18n/i18n.module';
import { LocaleContextMiddleware } from './common/i18n/services/locale-context.middleware';
import { PrismaModule } from './common/prisma/prisma.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { LoggingModule } from './common/logging/logging.module';
import { RequestContextMiddleware } from './common/logging/request-context.middleware';
import { ThrottleModule } from './common/throttle/throttle.module';
import { ThrottlePolicyGuard } from './common/throttle/throttle-policy.guard';
import { SecurityAuditModule } from './common/security-audit/security-audit.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { AdminModule } from './modules/admin/admin.module';
import { AssessmentsModule } from './modules/assessments/assessments.module';
import { ArticlesModule } from './modules/articles/articles.module';
import { AvailabilityModule } from './modules/availability/availability.module';
import { CareChatModule } from './modules/care-chat/care-chat.module';
import { ChatModule } from './modules/chat/chat.module';
import { ConfigModule } from './modules/config/config.module';
import { FinancialRulesModule } from './modules/financial-rules/financial-rules.module';
import { FinancialOperationsModule } from './modules/financial-operations/financial-operations.module';
import { CustomerWalletsModule } from './modules/customer-wallets/customer-wallets.module';
import { InstantBookingModule } from './modules/instant-booking/instant-booking.module';
import { MatchingModule } from './modules/matching/matching.module';
import { ModerationModule } from './modules/moderation/moderation.module';
import { PatientsModule } from './modules/patients/patients.module';
import { PatientsAdminModule } from './modules/patients/admin/patients-admin.module';
import { PatientJourneyModule } from './modules/patient-journey/patient-journey.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { PresenceModule } from './modules/presence/presence.module';
import { PractitionersModule } from './modules/practitioners/practitioners.module';
import { PackagePlansModule } from './modules/package-plans/package-plans.module';
import { HelpModule } from './modules/help/help.module';
import { RefundPoliciesModule } from './modules/refund-policies/refund-policies.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { SessionsModule } from './modules/sessions/sessions.module';
import { SettingsModule } from './modules/settings/settings.module';
import { SpecialtiesModule } from './modules/specialties/specialties.module';
import { SupportModule } from './modules/support/support.module';
import { AcademyModule } from './modules/academy/academy.module';
import { TrainingModule } from './modules/training/training.module';
import { UsersModule } from './modules/users/users.module';
import { ReportsModule } from './modules/reports/reports.module';

@Module({
  imports: [
    EnvConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validate,
      load: [
        appConfig,
        databaseConfig,
        authConfig,
        paymentConfig,
        videoConfig,
        notificationConfig,
        moduleConfig,
        loggingConfig,
        sessionConfig,
      ],
    }),
    LoggingModule,
    I18nModule,
    PrismaModule,
    ThrottleModule,
    SecurityAuditModule,
    HealthModule,
    ConfigModule,
    AuthModule,
    AdminModule,
    AssessmentsModule,
    ArticlesModule,
    AvailabilityModule,
    CareChatModule,
    ChatModule,
    FinancialOperationsModule,
    FinancialRulesModule,
    CustomerWalletsModule,
    MatchingModule,
    ModerationModule,
    PatientJourneyModule,
    PatientsModule,
    PatientsAdminModule,
    InstantBookingModule,
    PaymentsModule,
    PresenceModule,
    PractitionersModule,
    PackagePlansModule,
    HelpModule,
    RefundPoliciesModule,
    ReviewsModule,
    SessionsModule,
    SettingsModule,
    SpecialtiesModule,
    SupportModule,
    AcademyModule,
    TrainingModule,
    UsersModule,
    ReportsModule,
  ],
  providers: [
    AllExceptionsFilter,
    {
      provide: APP_GUARD,
      useClass: ThrottlePolicyGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(RequestContextMiddleware, LocaleContextMiddleware)
      .forRoutes({
        path: '*path',
        method: RequestMethod.ALL,
      });
  }
}
