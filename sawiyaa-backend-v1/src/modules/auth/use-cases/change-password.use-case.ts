import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';
import { SecurityAuditService } from '@common/security-audit/security-audit.service';
import { SecurityAuditOutcome, UserRoleType, UserStatus } from '@prisma/client';
import { AuthIdentityRepository } from '../repositories/auth-identity.repository';
import { UserRepository } from '../repositories/user.repository';
import { HashPasswordUseCase } from './hash-password.use-case';
import { InvalidateUserTokensUseCase } from './invalidate-user-tokens.use-case';
import { VerifyPasswordUseCase } from './verify-password.use-case';

/**
 * Authenticated credential rotation.  We deliberately invalidate every session,
 * including the current one, instead of carrying a fragile session exception.
 */
@Injectable()
export class ChangePasswordUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userRepository: UserRepository,
    private readonly authIdentityRepository: AuthIdentityRepository,
    private readonly verifyPasswordUseCase: VerifyPasswordUseCase,
    private readonly hashPasswordUseCase: HashPasswordUseCase,
    private readonly invalidateUserTokensUseCase: InvalidateUserTokensUseCase,
    private readonly securityAuditService: SecurityAuditService,
  ) {}

  async execute(input: {
    userId: string;
    role: Extract<UserRoleType, 'PATIENT' | 'PRACTITIONER'>;
    currentPassword: string;
    newPassword: string;
    ipAddress?: string | null;
    userAgent?: string | null;
  }) {
    const user = await this.userRepository.findByIdWithAuthContext(input.userId);
    if (!user || user.status !== UserStatus.ACTIVE || !user.roles.some((entry) => entry.role === input.role)) {
      throw new ForbiddenException({
        messageKey: 'auth.errors.accountNotActive',
        error: 'ACCOUNT_NOT_ACTIVE',
      });
    }

    const identity = await this.authIdentityRepository.findPasswordIdentityByUserId(input.userId);
    if (!identity?.passwordHash) {
      throw new BadRequestException({
        messageKey: 'auth.errors.passwordChangeUnavailable',
        error: 'PASSWORD_CHANGE_UNAVAILABLE',
      });
    }

    const currentPasswordMatches = await this.verifyPasswordUseCase.execute(input.currentPassword, identity.passwordHash);
    if (!currentPasswordMatches) {
      this.securityAuditService.logAsync({
        action: `auth.${input.role.toLowerCase()}.password-change.failure`,
        outcome: SecurityAuditOutcome.FAILURE,
        actorUserId: input.userId,
        actorRoles: [input.role],
        reason: 'CURRENT_PASSWORD_INVALID',
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
      });
      throw new UnauthorizedException({
        messageKey: 'auth.errors.currentPasswordInvalid',
        error: 'CURRENT_PASSWORD_INVALID',
      });
    }

    if (await this.verifyPasswordUseCase.execute(input.newPassword, identity.passwordHash)) {
      throw new BadRequestException({
        messageKey: 'auth.errors.newPasswordMustDiffer',
        error: 'NEW_PASSWORD_MUST_DIFFER',
      });
    }

    const passwordHash = await this.hashPasswordUseCase.execute(input.newPassword);
    await this.prisma.$transaction(async (tx) => {
      await this.authIdentityRepository.updatePasswordHash(input.userId, passwordHash, tx);
      await this.invalidateUserTokensUseCase.execute(input.userId, tx);
    });

    this.securityAuditService.logAsync({
      action: `auth.${input.role.toLowerCase()}.password-change.success`,
      outcome: SecurityAuditOutcome.SUCCESS,
      actorUserId: input.userId,
      actorRoles: [input.role],
      resourceType: 'User',
      resourceId: input.userId,
      reason: 'PASSWORD_CHANGED_ALL_SESSIONS_REVOKED',
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
    });

    return { currentSessionInvalidated: true };
  }
}
