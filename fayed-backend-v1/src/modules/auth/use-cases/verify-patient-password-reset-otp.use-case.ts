import { ConflictException, Injectable } from '@nestjs/common';
import { I18nService } from '@common/i18n/services/i18n.service';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { OtpPurpose, UserRoleType } from '@prisma/client';
import { VerifyOtpChallengeUseCase } from '../../verification/use-cases/verify-otp-challenge.use-case';
import { PasswordResetSessionRepository } from '../repositories/password-reset-session.repository';
import { UserEmailRepository } from '../repositories/user-email.repository';
import { PasswordResetTokenService } from '../services/password-reset-token.service';

@Injectable()
export class VerifyPatientPasswordResetOtpUseCase {
  constructor(
    private readonly i18nService: I18nService,
    private readonly userEmailRepository: UserEmailRepository,
    private readonly verifyOtpChallengeUseCase: VerifyOtpChallengeUseCase,
    private readonly passwordResetSessionRepository: PasswordResetSessionRepository,
    private readonly passwordResetTokenService: PasswordResetTokenService,
  ) {}

  async execute(input: {
    email: string;
    code: string;
    locale: SupportedLocale;
  }) {
    const normalizedEmail = input.email.trim().toLowerCase();
    const userEmail =
      await this.userEmailRepository.findByEmailForAuth(normalizedEmail);

    if (!userEmail) {
      throw new ConflictException({
        messageKey: 'auth.errors.passwordResetAccountNotFound',
        error: 'PASSWORD_RESET_ACCOUNT_NOT_FOUND',
      });
    }

    const hasPatientRole = userEmail.user.roles.some(
      (role) => role.role === UserRoleType.PATIENT,
    );

    if (!hasPatientRole) {
      throw new ConflictException({
        messageKey: 'auth.errors.passwordResetAccountNotFound',
        error: 'PASSWORD_RESET_ACCOUNT_NOT_FOUND',
      });
    }

    const challenge = await this.verifyOtpChallengeUseCase.execute({
      userId: userEmail.user.id,
      code: input.code,
      purpose: OtpPurpose.PASSWORD_RESET,
    });

    const verifiedForPatient =
      challenge.user?.roles.some(
        (role) => role.role === UserRoleType.PATIENT,
      ) ?? false;

    if (!challenge.user || !verifiedForPatient) {
      throw new ConflictException({
        messageKey: 'auth.errors.passwordResetAccountNotFound',
        error: 'PASSWORD_RESET_ACCOUNT_NOT_FOUND',
      });
    }

    const resetToken = this.passwordResetTokenService.generateToken();
    const tokenHash = this.passwordResetTokenService.hashToken(resetToken);
    const expiresAt = new Date(
      Date.now() +
        this.passwordResetTokenService.getSessionTtlMinutes() * 60 * 1000,
    );

    await this.passwordResetSessionRepository.invalidateActiveByUserIdAndRole(
      challenge.user.id,
      UserRoleType.PATIENT,
    );

    await this.passwordResetSessionRepository.create({
      userId: challenge.user.id,
      role: UserRoleType.PATIENT,
      tokenHash,
      expiresAt,
    });

    return {
      message: this.i18nService.t(
        'auth.success.patientPasswordResetOtpVerified',
        input.locale,
      ),
      resetToken,
      expiresAt: expiresAt.toISOString(),
      nextStep: 'SET_NEW_PASSWORD',
    };
  }
}
