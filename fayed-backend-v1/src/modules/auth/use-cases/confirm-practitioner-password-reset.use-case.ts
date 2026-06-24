import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { I18nService } from '@common/i18n/services/i18n.service';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { PrismaService } from '@common/prisma/prisma.service';
import { UserRoleType } from '@prisma/client';
import { AuthIdentityRepository } from '../repositories/auth-identity.repository';
import { PasswordResetSessionRepository } from '../repositories/password-reset-session.repository';
import { HashPasswordUseCase } from './hash-password.use-case';
import { InvalidateUserTokensUseCase } from './invalidate-user-tokens.use-case';
import { PasswordResetTokenService } from '../services/password-reset-token.service';

@Injectable()
export class ConfirmPractitionerPasswordResetUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly i18nService: I18nService,
    private readonly passwordResetSessionRepository: PasswordResetSessionRepository,
    private readonly passwordResetTokenService: PasswordResetTokenService,
    private readonly hashPasswordUseCase: HashPasswordUseCase,
    private readonly authIdentityRepository: AuthIdentityRepository,
    private readonly invalidateUserTokensUseCase: InvalidateUserTokensUseCase,
  ) {}

  async execute(input: {
    resetToken: string;
    newPassword: string;
    locale: SupportedLocale;
  }) {
    const tokenHash = this.passwordResetTokenService.hashToken(
      input.resetToken,
    );
    const resetSession =
      await this.passwordResetSessionRepository.findActiveByTokenHash(
        tokenHash,
      );

    if (!resetSession) {
      throw new UnauthorizedException({
        messageKey: 'auth.errors.passwordResetTokenInvalid',
        error: 'PASSWORD_RESET_TOKEN_INVALID',
      });
    }

    const hasPractitionerRole = resetSession.user.roles.some(
      (role) => role.role === UserRoleType.PRACTITIONER,
    );

    if (
      resetSession.role !== UserRoleType.PRACTITIONER ||
      !hasPractitionerRole
    ) {
      throw new ConflictException({
        messageKey: 'auth.errors.passwordResetAccountNotFound',
        error: 'PASSWORD_RESET_ACCOUNT_NOT_FOUND',
      });
    }

    const passwordHash = await this.hashPasswordUseCase.execute(
      input.newPassword,
    );

    await this.prisma.$transaction(async (tx) => {
      await this.authIdentityRepository.updatePasswordHash(
        resetSession.userId,
        passwordHash,
        tx,
      );

      await this.invalidateUserTokensUseCase.execute(resetSession.userId, tx);
      await this.passwordResetSessionRepository.consume(resetSession.id, tx);
    });

    return {
      message: this.i18nService.t(
        'auth.success.practitionerPasswordResetCompleted',
        input.locale,
      ),
    };
  }
}
