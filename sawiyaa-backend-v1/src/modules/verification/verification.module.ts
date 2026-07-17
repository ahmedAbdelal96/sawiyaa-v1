import { Module } from '@nestjs/common';
import { PrismaModule } from '@common/prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { OtpChallengeRepository } from './repositories/otp-challenge.repository';
import { VerificationNotificationRepository } from './repositories/notification.repository';
import { OtpCodeGeneratorService } from './services/otp-code-generator.service';
import { OtpHashService } from './services/otp-hash.service';
import { OtpPolicyResolverService } from './services/otp-policy-resolver.service';
import { OtpDeliveryDispatcherService } from './services/otp-delivery-dispatcher.service';
import { PasswordResetRateLimitService } from './services/password-reset-rate-limit.service';
import { CreateOtpChallengeUseCase } from './use-cases/create-otp-challenge.use-case';
import { SendOtpChallengeUseCase } from './use-cases/send-otp-challenge.use-case';
import { VerifyOtpChallengeUseCase } from './use-cases/verify-otp-challenge.use-case';
import { InvalidateOtpChallengeUseCase } from './use-cases/invalidate-otp-challenge.use-case';
import { ResendOtpChallengeUseCase } from './use-cases/resend-otp-challenge.use-case';
import { PractitionerOtpQaCaptureService } from './services/practitioner-otp-qa-capture.service';

/**
 * Verification module provides reusable OTP challenge lifecycle and delivery.
 * Business flows should consume these use cases instead of owning OTP logic directly.
 */
@Module({
  imports: [PrismaModule, NotificationsModule],
  providers: [
    OtpChallengeRepository,
    VerificationNotificationRepository,
    OtpCodeGeneratorService,
    OtpHashService,
    OtpPolicyResolverService,
    OtpDeliveryDispatcherService,
    PractitionerOtpQaCaptureService,
    PasswordResetRateLimitService,
    CreateOtpChallengeUseCase,
    SendOtpChallengeUseCase,
    VerifyOtpChallengeUseCase,
    InvalidateOtpChallengeUseCase,
    ResendOtpChallengeUseCase,
  ],
  exports: [
    CreateOtpChallengeUseCase,
    SendOtpChallengeUseCase,
    VerifyOtpChallengeUseCase,
    InvalidateOtpChallengeUseCase,
    ResendOtpChallengeUseCase,
    PasswordResetRateLimitService,
  ],
})
export class VerificationModule {}
