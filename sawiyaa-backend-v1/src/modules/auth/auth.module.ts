import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { JwtAccessAuthGuard } from '@common/guards/authentication/jwt-access-auth.guard';
import { JwtRefreshAuthGuard } from '@common/guards/authentication/jwt-refresh-auth.guard';
import { AdminAuthController } from './controllers/admin-auth.controller';
import { CurrentAuthUserController } from './controllers/current-auth-user.controller';
import { PatientAuthController } from './controllers/patient-auth.controller';
import { PractitionerAuthController } from './controllers/practitioner-auth.controller';
import { AuthUserContextMapper } from './mappers/auth-user-context.mapper';
import { AuthIdentityRepository } from './repositories/auth-identity.repository';
import { PasswordResetSessionRepository } from './repositories/password-reset-session.repository';
import { TwoFactorSettingRepository } from './repositories/two-factor-setting.repository';
import { UserEmailRepository } from './repositories/user-email.repository';
import { UserPhoneRepository } from './repositories/user-phone.repository';
import { UserRepository } from './repositories/user.repository';
import { UserSessionRepository } from './repositories/user-session.repository';
import { AuthRequestContextMiddleware } from './services/auth-request-context.middleware';
import { AuthRequestContextService } from './services/auth-request-context.service';
import { AuthSessionService } from './services/auth-session.service';
import { AuthTokenService } from './services/auth-token.service';
import { GoogleIdentityService } from './services/google-identity.service';
import { PasswordHashService } from './services/password-hash.service';
import { PasswordResetTokenService } from './services/password-reset-token.service';
import { AuthLockoutService } from './services/auth-lockout.service';
import { PractitionerOtpChannelService } from './services/practitioner-otp-channel.service';
import { PatientOtpChannelService } from './services/patient-otp-channel.service';
import { StepUpService } from './services/step-up.service';
import { GetCurrentAuthUserUseCase } from './use-cases/get-current-auth-user.use-case';
import { HashPasswordUseCase } from './use-cases/hash-password.use-case';
import { IssueAuthTokensUseCase } from './use-cases/issue-auth-tokens.use-case';
import { InvalidateUserTokensUseCase } from './use-cases/invalidate-user-tokens.use-case';
import { LoginAdminUseCase } from './use-cases/login-admin.use-case';
import { LoginPatientWithEmailPasswordUseCase } from './use-cases/login-patient-with-email-password.use-case';
import { LoginPractitionerPasswordUseCase } from './use-cases/login-practitioner-password.use-case';
import { LogoutAdminUseCase } from './use-cases/logout-admin.use-case';
import { LogoutPatientUseCase } from './use-cases/logout-patient.use-case';
import { LogoutPractitionerUseCase } from './use-cases/logout-practitioner.use-case';
import { RefreshAdminTokenUseCase } from './use-cases/refresh-admin-token.use-case';
import { RefreshAuthSessionUseCase } from './use-cases/refresh-auth-session.use-case';
import { RefreshPatientTokenUseCase } from './use-cases/refresh-patient-token.use-case';
import { RefreshPractitionerTokenUseCase } from './use-cases/refresh-practitioner-token.use-case';
import { RegisterPatientWithEmailPasswordUseCase } from './use-cases/register-patient-with-email-password.use-case';
import { RegisterPatientWithGoogleUseCase } from './use-cases/register-patient-with-google.use-case';
import { RegisterPractitionerAccountUseCase } from './use-cases/register-practitioner-account.use-case';
import { RequestPractitionerPasswordResetUseCase } from './use-cases/request-practitioner-password-reset.use-case';
import { ResetPractitionerPasswordUseCase } from './use-cases/reset-practitioner-password.use-case';
import { RequestPatientPasswordResetUseCase } from './use-cases/request-patient-password-reset.use-case';
import { ResetPatientPasswordUseCase } from './use-cases/reset-patient-password.use-case';
import { VerifyPatientPasswordResetOtpUseCase } from './use-cases/verify-patient-password-reset-otp.use-case';
import { ConfirmPatientPasswordResetUseCase } from './use-cases/confirm-patient-password-reset.use-case';
import { VerifyPractitionerPasswordResetOtpUseCase } from './use-cases/verify-practitioner-password-reset-otp.use-case';
import { ConfirmPractitionerPasswordResetUseCase } from './use-cases/confirm-practitioner-password-reset.use-case';
import { RevokeAuthSessionUseCase } from './use-cases/revoke-auth-session.use-case';
import { VerifyAdminStepUpUseCase } from './use-cases/verify-admin-step-up.use-case';
import { VerifyPasswordUseCase } from './use-cases/verify-password.use-case';
import { VerifyPractitionerLoginOtpUseCase } from './use-cases/verify-practitioner-login-otp.use-case';
import { PresenceModule } from '../presence/presence.module';
import { VerificationModule } from '../verification/verification.module';
import { CountryRepository } from '../patients/repositories/country.repository';
import { PractitionerLoginOtpConfigurationWarningService } from './services/practitioner-login-otp-configuration-warning.service';

@Module({
  imports: [JwtModule.register({}), VerificationModule, PresenceModule],
  controllers: [
    PatientAuthController,
    PractitionerAuthController,
    AdminAuthController,
    CurrentAuthUserController,
  ],
  providers: [
    JwtAccessAuthGuard,
    JwtRefreshAuthGuard,
    AuthUserContextMapper,
    UserRepository,
    UserEmailRepository,
    PasswordResetSessionRepository,
    UserPhoneRepository,
    AuthIdentityRepository,
    UserSessionRepository,
    TwoFactorSettingRepository,
    PasswordHashService,
    PasswordResetTokenService,
    AuthTokenService,
    AuthSessionService,
    GoogleIdentityService,
    AuthLockoutService,
    PractitionerOtpChannelService,
    PatientOtpChannelService,
    StepUpService,
    AuthRequestContextService,
    AuthRequestContextMiddleware,
    HashPasswordUseCase,
    VerifyPasswordUseCase,
    IssueAuthTokensUseCase,
    CountryRepository,
    InvalidateUserTokensUseCase,
    RefreshAuthSessionUseCase,
    RevokeAuthSessionUseCase,
    GetCurrentAuthUserUseCase,
    RegisterPatientWithGoogleUseCase,
    RegisterPatientWithEmailPasswordUseCase,
    LoginPatientWithEmailPasswordUseCase,
    RefreshPatientTokenUseCase,
    LogoutPatientUseCase,
    RequestPatientPasswordResetUseCase,
    VerifyPatientPasswordResetOtpUseCase,
    ConfirmPatientPasswordResetUseCase,
    ResetPatientPasswordUseCase,
    RegisterPractitionerAccountUseCase,
    LoginPractitionerPasswordUseCase,
    VerifyPractitionerLoginOtpUseCase,
    RequestPractitionerPasswordResetUseCase,
    VerifyPractitionerPasswordResetOtpUseCase,
    ConfirmPractitionerPasswordResetUseCase,
    ResetPractitionerPasswordUseCase,
    RefreshPractitionerTokenUseCase,
    LogoutPractitionerUseCase,
    LoginAdminUseCase,
    RefreshAdminTokenUseCase,
    LogoutAdminUseCase,
    VerifyAdminStepUpUseCase,
    PractitionerLoginOtpConfigurationWarningService,
  ],
  exports: [
    JwtAccessAuthGuard,
    JwtRefreshAuthGuard,
    GetCurrentAuthUserUseCase,
    AuthLockoutService,
    AuthRequestContextService,
    StepUpService,
  ],
})
export class AuthModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(AuthRequestContextMiddleware).forRoutes({
      path: '*path',
      method: RequestMethod.ALL,
    });
  }
}
