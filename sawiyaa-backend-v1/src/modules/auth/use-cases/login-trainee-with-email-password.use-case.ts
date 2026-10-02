import { Injectable } from '@nestjs/common';
import { SecurityAuditOutcome, UserRoleType, UserStatus } from '@prisma/client';
import { SecurityAuditService } from '@common/security-audit/security-audit.service';
import { IssueAuthTokensUseCase } from './issue-auth-tokens.use-case';
import { VerifyPasswordUseCase } from './verify-password.use-case';
import { AuthIdentityRepository } from '../repositories/auth-identity.repository';
import { UserEmailRepository } from '../repositories/user-email.repository';
import { AuthSessionDeviceContext } from '../types/auth-session.types';
import { AUTH_LOCKOUT_CONTEXTS, AuthLockoutState } from '../types/auth-lockout.types';
import { AuthLockoutService } from '../services/auth-lockout.service';
import { createInvalidLoginException, createLockedLoginException } from '../utils/auth-lockout-response.util';

@Injectable()
export class LoginTraineeWithEmailPasswordUseCase {
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
    const email = input.email.trim().toLowerCase();
    const userEmail = await this.userEmailRepository.findByEmailForAuth(email);
    const subject = userEmail ? `user:${userEmail.user.id}` : `email:${email}`;
    if (!userEmail) return this.failed(subject, 'USER_NOT_FOUND', input);

    const lockout = await this.authLockoutService.getState(AUTH_LOCKOUT_CONTEXTS.TRAINEE_PASSWORD_LOGIN, subject);
    if (lockout.isLocked) throw createLockedLoginException(lockout);

    const roles = userEmail.user.roles.map((role) => role.role);
    if (!roles.includes(UserRoleType.TRAINEE)) return this.failed(subject, 'TRAINEE_ROLE_REQUIRED', input, userEmail.user.id, roles);
    if (userEmail.user.status !== UserStatus.ACTIVE) return this.failed(subject, 'ACCOUNT_NOT_ACTIVE', input, userEmail.user.id, roles);

    const identity = await this.authIdentityRepository.findPasswordIdentityByUserId(userEmail.user.id);
    if (!identity?.passwordHash) return this.failed(subject, 'NO_PASSWORD_IDENTITY', input, userEmail.user.id, roles);
    if (!await this.verifyPasswordUseCase.execute(input.password, identity.passwordHash)) {
      return this.failed(subject, 'INVALID_PASSWORD', input, userEmail.user.id, roles);
    }

    await this.authIdentityRepository.touchLastUsed(identity.id);
    await this.authLockoutService.clear(AUTH_LOCKOUT_CONTEXTS.TRAINEE_PASSWORD_LOGIN, subject);
    const result = await this.issueAuthTokensUseCase.execute({ userId: userEmail.user.id, role: UserRoleType.TRAINEE, deviceContext: input.deviceContext });
    this.securityAuditService.logAsync({ action: 'auth.trainee.login.success', outcome: SecurityAuditOutcome.SUCCESS, actorUserId: userEmail.user.id, actorRoles: [UserRoleType.TRAINEE], ipAddress: input.ipAddress ?? null, userAgent: input.userAgent ?? null });
    return result;
  }

  private async failed(subject: string, reason: string, input: { ipAddress?: string | null; userAgent?: string | null }, actorUserId?: string, actorRoles?: UserRoleType[]): Promise<never> {
    const state = await this.authLockoutService.recordFailure(AUTH_LOCKOUT_CONTEXTS.TRAINEE_PASSWORD_LOGIN, subject);
    this.securityAuditService.logAsync({ action: 'auth.trainee.login.failure', outcome: SecurityAuditOutcome.FAILURE, actorUserId: actorUserId ?? null, actorRoles, reason: state.isLocked ? 'LOGIN_TEMPORARILY_LOCKED' : reason, ipAddress: input.ipAddress ?? null, userAgent: input.userAgent ?? null, metadata: this.lockoutMetadata(state) });
    throw state.isLocked ? createLockedLoginException(state) : createInvalidLoginException(state);
  }

  private lockoutMetadata(state: AuthLockoutState) {
    return { attemptCount: state.attemptCount, remainingAttempts: state.remainingAttempts, maxAttempts: state.maxAttempts, lockedUntil: state.lockedUntil?.toISOString() ?? null, retryAfterSeconds: state.retryAfterSeconds, isLocked: state.isLocked };
  }
}
