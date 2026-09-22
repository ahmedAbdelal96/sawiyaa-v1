import {
  ConflictException,
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { I18nService } from '@common/i18n/services/i18n.service';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { PrismaService } from '@common/prisma/prisma.service';
import { UserRoleType, UserStatus } from '@prisma/client';
import { UserRepository } from '../repositories/user.repository';
import { AuthIdentityRepository } from '../repositories/auth-identity.repository';
import { PasswordResetSessionRepository } from '../repositories/password-reset-session.repository';
import { HashPasswordUseCase } from './hash-password.use-case';
import { InvalidateUserTokensUseCase } from './invalidate-user-tokens.use-case';
import { IssueAuthTokensUseCase } from './issue-auth-tokens.use-case';
import { AuthSessionDeviceContext } from '../types/auth-session.types';
import { PasswordResetTokenService } from '../services/password-reset-token.service';
import { SecurityAuditService } from '@common/security-audit/security-audit.service';
import { SecurityAuditOutcome } from '@prisma/client';

@Injectable()
export class ConfirmPatientPasswordResetUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly i18nService: I18nService,
    private readonly passwordResetSessionRepository: PasswordResetSessionRepository,
    private readonly passwordResetTokenService: PasswordResetTokenService,
    private readonly hashPasswordUseCase: HashPasswordUseCase,
    private readonly authIdentityRepository: AuthIdentityRepository,
    private readonly invalidateUserTokensUseCase: InvalidateUserTokensUseCase,
    private readonly issueAuthTokensUseCase: IssueAuthTokensUseCase,
    private readonly userRepository: UserRepository,
    private readonly securityAuditService?: SecurityAuditService,
  ) {}

  async execute(input: {
    resetToken: string;
    newPassword: string;
    locale: SupportedLocale;
    deviceContext: AuthSessionDeviceContext;
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

    const hasPatientRole = resetSession.user.roles.some(
      (role) => role.role === UserRoleType.PATIENT,
    );

    if (resetSession.role !== UserRoleType.PATIENT || !hasPatientRole) {
      throw new ConflictException({
        messageKey: 'auth.errors.passwordResetAccountNotFound',
        error: 'PASSWORD_RESET_ACCOUNT_NOT_FOUND',
      });
    }

    const currentUser = await this.userRepository.findByIdWithAuthContext(resetSession.userId);
    if (!currentUser || currentUser.status !== UserStatus.ACTIVE) {
      throw new ForbiddenException({ messageKey: 'auth.errors.accountNotEligible', error: 'ACCOUNT_NOT_ELIGIBLE' });
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

    this.securityAuditService?.logAsync({
      action: 'auth.patient.password-reset.complete.success',
      outcome: SecurityAuditOutcome.SUCCESS,
      actorUserId: resetSession.userId,
      actorRoles: [UserRoleType.PATIENT],
      resourceType: 'User',
      resourceId: resetSession.userId,
      reason: 'PASSWORD_RESET_COMPLETED',
    });

    const session = await this.issueAuthTokensUseCase.execute({
      userId: resetSession.userId,
      role: UserRoleType.PATIENT,
      deviceContext: input.deviceContext,
      requireCurrentEligibility: true,
    });
    return {
      message: this.i18nService.t(
        'auth.success.patientPasswordResetCompleted',
        input.locale,
      ),
      ...session,
    };
  }
}
