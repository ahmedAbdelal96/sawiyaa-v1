import { ConflictException, Injectable } from '@nestjs/common';
import { I18nService } from '@common/i18n/services/i18n.service';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { OtpPurpose, UserRoleType } from '@prisma/client';
import { TwoFactorSettingRepository } from '../repositories/two-factor-setting.repository';
import { UserEmailRepository } from '../repositories/user-email.repository';
import { PractitionerOtpChannelService } from '../services/practitioner-otp-channel.service';
import { CreateOtpChallengeUseCase } from '../../verification/use-cases/create-otp-challenge.use-case';
import { SendOtpChallengeUseCase } from '../../verification/use-cases/send-otp-challenge.use-case';
import { OtpResendCooldownException } from '../../verification/exceptions/otp-cooldown.exception';
import { PasswordResetRateLimitService } from '../../verification/services/password-reset-rate-limit.service';
import { OtpEmailRoleRateLimitException } from '../../verification/exceptions/otp-rate-limit.exception';

/**
 * Forgot-password validates that a practitioner account exists, then issues a reset OTP.
 */
@Injectable()
export class RequestPractitionerPasswordResetUseCase {
  constructor(
    private readonly i18nService: I18nService,
    private readonly userEmailRepository: UserEmailRepository,
    private readonly twoFactorSettingRepository: TwoFactorSettingRepository,
    private readonly practitionerOtpChannelService: PractitionerOtpChannelService,
    private readonly createOtpChallengeUseCase: CreateOtpChallengeUseCase,
    private readonly sendOtpChallengeUseCase: SendOtpChallengeUseCase,
    private readonly passwordResetRateLimitService: PasswordResetRateLimitService,
  ) {}

  async execute(input: { email: string; locale: SupportedLocale }) {
    const normalizedEmail = input.email.trim().toLowerCase();
    const userEmail =
      await this.userEmailRepository.findByEmailForAuth(normalizedEmail);

    if (!userEmail) {
      throw new ConflictException({
        messageKey: 'auth.errors.passwordResetAccountNotFound',
        error: 'PASSWORD_RESET_ACCOUNT_NOT_FOUND',
      });
    }

    const hasPractitionerRole = userEmail.user.roles.some(
      (role) => role.role === UserRoleType.PRACTITIONER,
    );

    if (!hasPractitionerRole) {
      throw new ConflictException({
        messageKey: 'auth.errors.passwordResetAccountNotFound',
        error: 'PASSWORD_RESET_ACCOUNT_NOT_FOUND',
      });
    }

    const twoFactorSetting = await this.twoFactorSettingRepository.findByUserId(
      userEmail.user.id,
    );

    // Enforce per-email+role rate limits before creating the challenge.
    const rateLimitCheck = await this.passwordResetRateLimitService.check(
      normalizedEmail,
      'practitioner',
    );
    if (!rateLimitCheck.allowed) {
      throw new OtpEmailRoleRateLimitException(
        rateLimitCheck.retryAfterSeconds,
        rateLimitCheck.reason,
      );
    }

    try {
      const resolvedChannel =
        this.practitionerOtpChannelService.resolveVerifiedChannel(
          {
            emails: userEmail.user.emails ?? [],
            phones: userEmail.user.phones ?? [],
          },
          twoFactorSetting,
        );
      const challenge = await this.createOtpChallengeUseCase.execute({
        userId: userEmail.user.id,
        purpose: OtpPurpose.PASSWORD_RESET,
        channel: resolvedChannel.channel,
        target: resolvedChannel.target,
      });

      await this.sendOtpChallengeUseCase.execute({
        challengeId: challenge.challengeId,
        userId: userEmail.user.id,
        purpose: OtpPurpose.PASSWORD_RESET,
        channel: resolvedChannel.channel,
        target: resolvedChannel.target,
        code: challenge.code,
        expiresAt: challenge.expiresAt,
        locale: input.locale,
        isPractitioner: true,
      });
    } catch (error) {
      // Let the cooldown and rate-limit exceptions propagate with their
      // structured payload so the API can return machine-readable metadata.
      if (
        error instanceof OtpResendCooldownException ||
        error instanceof OtpEmailRoleRateLimitException
      ) {
        throw error;
      }
      throw error;
    }

    return {
      message: this.i18nService.t(
        'auth.success.practitionerPasswordResetRequested',
        input.locale,
      ),
      nextStep: 'VERIFY_OTP',
    };
  }
}
