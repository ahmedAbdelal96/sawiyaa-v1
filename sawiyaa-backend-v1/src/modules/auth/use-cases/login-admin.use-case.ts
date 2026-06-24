import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { UserRoleType, UserStatus } from '@prisma/client';
import { SecurityAuditOutcome } from '@prisma/client';
import { SecurityAuditService } from '@common/security-audit/security-audit.service';
import { IssueAuthTokensUseCase } from './issue-auth-tokens.use-case';
import { VerifyPasswordUseCase } from './verify-password.use-case';
import { AuthIdentityRepository } from '../repositories/auth-identity.repository';
import { UserEmailRepository } from '../repositories/user-email.repository';
import { AuthSessionDeviceContext } from '../types/auth-session.types';
import { ADMIN_AUTH_ROLE_TYPES } from '../utils/auth-role.util';

/**
 * Admin auth is baseline-only: existing admin accounts can login, refresh, and logout.
 * There is no admin self-registration in this module.
 */
@Injectable()
export class LoginAdminUseCase {
  constructor(
    private readonly userEmailRepository: UserEmailRepository,
    private readonly authIdentityRepository: AuthIdentityRepository,
    private readonly verifyPasswordUseCase: VerifyPasswordUseCase,
    private readonly issueAuthTokensUseCase: IssueAuthTokensUseCase,
    private readonly securityAuditService: SecurityAuditService,
  ) {}

  async execute(input: {
    email: string;
    password: string;
    deviceContext: AuthSessionDeviceContext;
    ipAddress?: string | null;
    userAgent?: string | null;
  }) {
    const normalizedEmail = input.email.trim().toLowerCase();
    const userEmail =
      await this.userEmailRepository.findByEmailForAuth(normalizedEmail);

    if (!userEmail) {
      this.securityAuditService.logAsync({
        action: 'auth.admin.login.failure',
        outcome: SecurityAuditOutcome.FAILURE,
        reason: 'USER_NOT_FOUND',
        metadata: { emailDomain: normalizedEmail.split('@')[1] ?? null },
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
      });
      throw new UnauthorizedException({
        messageKey: 'auth.errors.invalidCredentials',
        error: 'INVALID_CREDENTIALS',
      });
    }

    const adminRole =
      userEmail.user.roles.find((role) =>
        ADMIN_AUTH_ROLE_TYPES.includes(role.role),
      )?.role ?? null;

    if (!adminRole) {
      this.securityAuditService.logAsync({
        action: 'auth.admin.login.failure',
        outcome: SecurityAuditOutcome.FAILURE,
        actorUserId: userEmail.user.id,
        actorRoles: userEmail.user.roles.map((r) => r.role),
        reason: 'ADMIN_ROLE_REQUIRED',
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
      });
      throw new ForbiddenException({
        messageKey: 'auth.errors.adminRoleRequired',
        error: 'ADMIN_ROLE_REQUIRED',
      });
    }

    if (userEmail.user.status !== UserStatus.ACTIVE) {
      this.securityAuditService.logAsync({
        action: 'auth.admin.login.failure',
        outcome: SecurityAuditOutcome.FAILURE,
        actorUserId: userEmail.user.id,
        actorRoles: userEmail.user.roles.map((r) => r.role),
        reason: 'ACCOUNT_NOT_ACTIVE',
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
      });
      throw new ForbiddenException({
        messageKey: 'auth.errors.accountNotActive',
        error: 'ACCOUNT_NOT_ACTIVE',
      });
    }

    const passwordIdentity =
      await this.authIdentityRepository.findPasswordIdentityByUserId(
        userEmail.user.id,
      );

    if (!passwordIdentity?.passwordHash) {
      this.securityAuditService.logAsync({
        action: 'auth.admin.login.failure',
        outcome: SecurityAuditOutcome.FAILURE,
        actorUserId: userEmail.user.id,
        actorRoles: userEmail.user.roles.map((r) => r.role),
        reason: 'NO_PASSWORD_IDENTITY',
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
      });
      throw new UnauthorizedException({
        messageKey: 'auth.errors.invalidCredentials',
        error: 'INVALID_CREDENTIALS',
      });
    }

    const isValidPassword = await this.verifyPasswordUseCase.execute(
      input.password,
      passwordIdentity.passwordHash,
    );

    if (!isValidPassword) {
      this.securityAuditService.logAsync({
        action: 'auth.admin.login.failure',
        outcome: SecurityAuditOutcome.FAILURE,
        actorUserId: userEmail.user.id,
        actorRoles: userEmail.user.roles.map((r) => r.role),
        reason: 'INVALID_PASSWORD',
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
      });
      throw new UnauthorizedException({
        messageKey: 'auth.errors.invalidCredentials',
        error: 'INVALID_CREDENTIALS',
      });
    }

    await this.authIdentityRepository.touchLastUsed(passwordIdentity.id);

    const result = await this.issueAuthTokensUseCase.execute({
      userId: userEmail.user.id,
      role: adminRole,
      deviceContext: input.deviceContext,
    });

    this.securityAuditService.logAsync({
      action: 'auth.admin.login.success',
      outcome: SecurityAuditOutcome.SUCCESS,
      actorUserId: userEmail.user.id,
      actorRoles: [adminRole],
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
    });

    return result;
  }
}
