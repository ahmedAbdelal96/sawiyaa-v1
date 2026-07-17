import { Injectable } from '@nestjs/common';
import { UserRoleType, UserStatus } from '@prisma/client';
import { SecurityAuditOutcome } from '@prisma/client';
import { SecurityAuditService } from '@common/security-audit/security-audit.service';
import { IssueAuthTokensUseCase } from './issue-auth-tokens.use-case';
import { VerifyPasswordUseCase } from './verify-password.use-case';
import { AuthIdentityRepository } from '../repositories/auth-identity.repository';
import { UserEmailRepository } from '../repositories/user-email.repository';
import { AuthSessionDeviceContext } from '../types/auth-session.types';
import { ADMIN_AUTH_ROLE_TYPES } from '../utils/auth-role.util';
import { AuthLockoutService } from '../services/auth-lockout.service';
import { AUTH_LOCKOUT_CONTEXTS } from '../types/auth-lockout.types';
import {
  createInvalidLoginException,
  createLockedLoginException,
} from '../utils/auth-lockout-response.util';

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
    private readonly authLockoutService: AuthLockoutService,
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
    const lockoutSubject = userEmail ? `user:${userEmail.user.id}` : `email:${normalizedEmail}`;

    if (!userEmail) {
      throw await this.throwFailedLogin({
        subject: lockoutSubject,
        reason: 'USER_NOT_FOUND',
        metadata: { emailDomain: normalizedEmail.split('@')[1] ?? null },
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
      });
    }

    const currentLockoutState = await this.authLockoutService.getState(
      AUTH_LOCKOUT_CONTEXTS.ADMIN_PASSWORD_LOGIN,
      lockoutSubject,
    );
    if (currentLockoutState.isLocked) {
      this.securityAuditService.logAsync({
        action: 'auth.admin.login.failure',
        outcome: SecurityAuditOutcome.FAILURE,
        actorUserId: userEmail.user.id,
        actorRoles: userEmail.user.roles.map((r) => r.role),
        reason: 'LOGIN_TEMPORARILY_LOCKED',
        metadata: {
          attemptCount: currentLockoutState.attemptCount,
          remainingAttempts: currentLockoutState.remainingAttempts,
          maxAttempts: currentLockoutState.maxAttempts,
          lockedUntil: currentLockoutState.lockedUntil?.toISOString() ?? null,
          retryAfterSeconds: currentLockoutState.retryAfterSeconds,
          isLocked: currentLockoutState.isLocked,
        },
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
      });
      throw createLockedLoginException(currentLockoutState);
    }

    const adminRole =
      userEmail.user.roles.find((role) =>
        ADMIN_AUTH_ROLE_TYPES.includes(role.role),
      )?.role ?? null;

    if (!adminRole) {
      throw await this.throwFailedLogin({
        subject: lockoutSubject,
        reason: 'ADMIN_ROLE_REQUIRED',
        actorUserId: userEmail.user.id,
        actorRoles: userEmail.user.roles.map((r) => r.role),
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
      });
    }

    if (userEmail.user.status !== UserStatus.ACTIVE) {
      throw await this.throwFailedLogin({
        subject: lockoutSubject,
        reason: 'ACCOUNT_NOT_ACTIVE',
        actorUserId: userEmail.user.id,
        actorRoles: userEmail.user.roles.map((r) => r.role),
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
      });
    }

    const passwordIdentity =
      await this.authIdentityRepository.findPasswordIdentityByUserId(
        userEmail.user.id,
      );

    if (!passwordIdentity?.passwordHash) {
      throw await this.throwFailedLogin({
        subject: lockoutSubject,
        reason: 'NO_PASSWORD_IDENTITY',
        actorUserId: userEmail.user.id,
        actorRoles: userEmail.user.roles.map((r) => r.role),
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
      });
    }

    const isValidPassword = await this.verifyPasswordUseCase.execute(
      input.password,
      passwordIdentity.passwordHash,
    );

    if (!isValidPassword) {
      throw await this.throwFailedLogin({
        subject: lockoutSubject,
        reason: 'INVALID_PASSWORD',
        actorUserId: userEmail.user.id,
        actorRoles: userEmail.user.roles.map((r) => r.role),
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
      });
    }

    await this.authIdentityRepository.touchLastUsed(passwordIdentity.id);
    await this.authLockoutService.clear(
      AUTH_LOCKOUT_CONTEXTS.ADMIN_PASSWORD_LOGIN,
      lockoutSubject,
    );

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

  private async throwFailedLogin(input: {
    subject: string;
    reason: string;
    actorUserId?: string;
    actorRoles?: UserRoleType[];
    metadata?: Record<string, unknown>;
    ipAddress?: string | null;
    userAgent?: string | null;
  }): Promise<never> {
    const state = await this.authLockoutService.recordFailure(
      AUTH_LOCKOUT_CONTEXTS.ADMIN_PASSWORD_LOGIN,
      input.subject,
    );

    this.securityAuditService.logAsync({
      action: 'auth.admin.login.failure',
      outcome: SecurityAuditOutcome.FAILURE,
      actorUserId: input.actorUserId ?? null,
      actorRoles: input.actorRoles,
      reason: state.isLocked ? 'LOGIN_TEMPORARILY_LOCKED' : input.reason,
      metadata: {
        attemptCount: state.attemptCount,
        remainingAttempts: state.remainingAttempts,
        maxAttempts: state.maxAttempts,
        lockedUntil: state.lockedUntil?.toISOString() ?? null,
        retryAfterSeconds: state.retryAfterSeconds,
        isLocked: state.isLocked,
        ...(input.metadata ?? {}),
      },
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
    });

    throw state.isLocked
      ? createLockedLoginException(state)
      : createInvalidLoginException(state);
  }
}
