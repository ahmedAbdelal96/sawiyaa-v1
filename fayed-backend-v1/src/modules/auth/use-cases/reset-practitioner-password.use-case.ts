import { ConflictException, Injectable } from '@nestjs/common';
import { I18nService } from '@common/i18n/services/i18n.service';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { PrismaService } from '@common/prisma/prisma.service';
import { OtpPurpose, UserRoleType } from '@prisma/client';
import { HashPasswordUseCase } from './hash-password.use-case';
import { InvalidateUserTokensUseCase } from './invalidate-user-tokens.use-case';
import { AuthIdentityRepository } from '../repositories/auth-identity.repository';
import { UserEmailRepository } from '../repositories/user-email.repository';
import { VerifyOtpChallengeUseCase } from '../../verification/use-cases/verify-otp-challenge.use-case';

/**
 * Reset password consumes a verified reset OTP and rotates the stored password hash.
 * It also bumps tokenVersion and revokes all active sessions so the new password
 * becomes the sole active credential baseline across every device.
 */
@Injectable()
export class ResetPractitionerPasswordUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly i18nService: I18nService,
    private readonly verifyOtpChallengeUseCase: VerifyOtpChallengeUseCase,
    private readonly hashPasswordUseCase: HashPasswordUseCase,
    private readonly authIdentityRepository: AuthIdentityRepository,
    private readonly userEmailRepository: UserEmailRepository,
    private readonly invalidateUserTokensUseCase: InvalidateUserTokensUseCase,
  ) {}

  async execute(input: {
    email: string;
    code: string;
    newPassword: string;
    locale: SupportedLocale;
  }) {
    const normalizedEmail = input.email.trim().toLowerCase();
    const userEmail =
      await this.userEmailRepository.findByEmail(normalizedEmail);

    if (!userEmail) {
      throw new ConflictException({
        messageKey: 'auth.errors.passwordResetPractitionerOnly',
        error: 'PRACTITIONER_ROLE_REQUIRED',
      });
    }

    // Reset verification is tied to the practitioner user, not to a specific target string.
    // This keeps the flow valid whether the reset OTP was delivered by email or SMS.
    const challenge = await this.verifyOtpChallengeUseCase.execute({
      userId: userEmail.user.id,
      code: input.code,
      purpose: OtpPurpose.PASSWORD_RESET,
    });

    const hasPractitionerRole =
      challenge.user?.roles.some(
        (role) => role.role === UserRoleType.PRACTITIONER,
      ) ?? false;

    if (!challenge.user || !hasPractitionerRole) {
      throw new ConflictException({
        messageKey: 'auth.errors.passwordResetPractitionerOnly',
        error: 'PRACTITIONER_ROLE_REQUIRED',
      });
    }

    const passwordHash = await this.hashPasswordUseCase.execute(
      input.newPassword,
    );
    await this.prisma.$transaction(async (transaction) => {
      await this.authIdentityRepository.updatePasswordHash(
        challenge.user!.id,
        passwordHash,
        transaction,
      );

      // Password reset is a global credential invalidation event.
      // We bump tokenVersion and revoke all sessions together so old access and
      // refresh tokens fail immediately across devices.
      await this.invalidateUserTokensUseCase.execute(
        challenge.user!.id,
        transaction,
      );
    });

    return {
      message: this.i18nService.t(
        'auth.success.practitionerPasswordResetCompleted',
        input.locale,
      ),
    };
  }
}
