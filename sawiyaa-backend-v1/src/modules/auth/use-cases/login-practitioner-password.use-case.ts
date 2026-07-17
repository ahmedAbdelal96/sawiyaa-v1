import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import {
  OtpPurpose,
  PractitionerStatus,
  SecurityAuditOutcome,
  UserRoleType,
  UserStatus,
} from '@prisma/client';
import { SecurityAuditService } from '@common/security-audit/security-audit.service';
import { AuthIdentityRepository } from '../repositories/auth-identity.repository';
import { IssueAuthTokensUseCase } from './issue-auth-tokens.use-case';
import { TwoFactorSettingRepository } from '../repositories/two-factor-setting.repository';
import { UserEmailRepository } from '../repositories/user-email.repository';
import { AuthSessionDeviceContext } from '../types/auth-session.types';
import { VerifyPasswordUseCase } from './verify-password.use-case';
import { PractitionerOtpChannelService } from '../services/practitioner-otp-channel.service';
import { CreateOtpChallengeUseCase } from '../../verification/use-cases/create-otp-challenge.use-case';
import { SendOtpChallengeUseCase } from '../../verification/use-cases/send-otp-challenge.use-case';
import { PractitionerPresenceRepository } from '@modules/presence/repositories/practitioner-presence.repository';
import { AuthLockoutService } from '../services/auth-lockout.service';
import { AUTH_LOCKOUT_CONTEXTS } from '../types/auth-lockout.types';
import {
  createInvalidLoginException,
  createLockedLoginException,
} from '../utils/auth-lockout-response.util';

/**
 * Practitioner login is intentionally split into password step and OTP step.
 * Password proves credential knowledge; OTP proves possession of a verified channel before issuing tokens.
 */
@Injectable()
export class LoginPractitionerPasswordUseCase {
  constructor(
    private readonly configService: ConfigService,
    private readonly userEmailRepository: UserEmailRepository,
    private readonly authIdentityRepository: AuthIdentityRepository,
    private readonly twoFactorSettingRepository: TwoFactorSettingRepository,
    private readonly verifyPasswordUseCase: VerifyPasswordUseCase,
    private readonly issueAuthTokensUseCase: IssueAuthTokensUseCase,
    private readonly practitionerPresenceRepository: PractitionerPresenceRepository,
    private readonly practitionerOtpChannelService: PractitionerOtpChannelService,
    private readonly createOtpChallengeUseCase: CreateOtpChallengeUseCase,
    private readonly sendOtpChallengeUseCase: SendOtpChallengeUseCase,
    private readonly authLockoutService: AuthLockoutService,
    private readonly securityAuditService: SecurityAuditService,
  ) {}

  async execute(input: {
    email: string;
    password: string;
    locale: SupportedLocale;
    deviceContext: AuthSessionDeviceContext;
    ipAddress?: string | null;
    userAgent?: string | null;
  }) {
    const normalizedEmail = input.email.trim().toLowerCase();
    const userEmail =
      await this.userEmailRepository.findByEmailForPractitionerAuth(
        normalizedEmail,
      );
    const lockoutSubject = userEmail ? `user:${userEmail.user.id}` : `email:${normalizedEmail}`;

    if (!userEmail || !userEmail.isPrimary) {
      throw await this.throwFailedLogin({
        subject: lockoutSubject,
        reason: !userEmail ? 'USER_NOT_FOUND' : 'NOT_PRIMARY_EMAIL',
        metadata: { emailDomain: normalizedEmail.split('@')[1] ?? null },
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
      });
    }

    const currentLockoutState = await this.authLockoutService.getState(
      AUTH_LOCKOUT_CONTEXTS.PRACTITIONER_PASSWORD_LOGIN,
      lockoutSubject,
    );
    if (currentLockoutState.isLocked) {
      this.securityAuditService.logAsync({
        action: 'auth.practitioner.login.failure',
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

    const hasPractitionerRole = userEmail.user.roles.some(
      (role) => role.role === UserRoleType.PRACTITIONER,
    );

    if (!hasPractitionerRole) {
      throw await this.throwFailedLogin({
        subject: lockoutSubject,
        reason: 'PRACTITIONER_ROLE_REQUIRED',
        actorUserId: userEmail.user.id,
        actorRoles: userEmail.user.roles.map((r) => r.role),
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
      });
    }

    const practitionerProfile = userEmail.user.practitionerProfile;
    if (!practitionerProfile) {
      throw await this.throwFailedLogin({
        subject: lockoutSubject,
        reason: 'PRACTITIONER_PROFILE_NOT_FOUND',
        actorUserId: userEmail.user.id,
        actorRoles: userEmail.user.roles.map((r) => r.role),
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
      });
    }

    if (practitionerProfile.status !== PractitionerStatus.APPROVED) {
      throw await this.throwFailedLogin({
        subject: lockoutSubject,
        reason: `PRACTITIONER_STATUS_${practitionerProfile.status}`,
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

    // Resolve the practitioner login OTP policy from config.
    // AUTH_PRACTITIONER_LOGIN_OTP_ENABLED is the primary source of truth.
    //
    // Behavior:
    //   - ENABLED='false'  → bypass OTP in any environment (emergency switch)
    //   - ENABLED='true'   → require OTP in any environment (legacy dev bypass ignored)
    //   - ENABLED='unset'  → fall back to legacy AUTH_PRACTITIONER_LOGIN_OTP_BYPASS_IN_DEV
    //                        in development only; production still requires OTP
    //   - Otherwise        → require OTP (secure default)
    const otpRequired =
      this.configService.get<boolean>('auth.practitionerLoginOtpRequired') !==
      false;
    // The registered config always supplies this boolean. The fallback keeps
    // older isolated unit-test config stubs safe without re-enabling legacy
    // environment flags in a real runtime.

    await this.authIdentityRepository.touchLastUsed(passwordIdentity.id);
    await this.practitionerPresenceRepository.markOnline(
      practitionerProfile.id,
    );
    await this.authLockoutService.clear(
      AUTH_LOCKOUT_CONTEXTS.PRACTITIONER_PASSWORD_LOGIN,
      lockoutSubject,
    );

    if (!otpRequired) {
      const result = await this.issueAuthTokensUseCase.execute({
        userId: userEmail.user.id,
        role: UserRoleType.PRACTITIONER,
        deviceContext: input.deviceContext,
      });

      this.securityAuditService.logAsync({
        action: 'auth.practitioner.login.success',
        outcome: SecurityAuditOutcome.SUCCESS,
        actorUserId: userEmail.user.id,
        actorRoles: [UserRoleType.PRACTITIONER],
        metadata: {
          authMethod: 'PASSWORD_ONLY_EMERGENCY_MODE',
          reason: 'OTP_DISABLED_BY_SERVER_CONFIGURATION',
        },
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
      });

      return { ...result, nextStep: 'AUTHENTICATED' as const };
    }

    const twoFactorSetting = await this.twoFactorSettingRepository.findByUserId(
      userEmail.user.id,
    );

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
      purpose: OtpPurpose.PRACTITIONER_LOGIN,
      channel: resolvedChannel.channel,
      target: resolvedChannel.target,
    });

    await this.sendOtpChallengeUseCase.execute({
      challengeId: challenge.challengeId,
      userId: userEmail.user.id,
      purpose: OtpPurpose.PRACTITIONER_LOGIN,
      channel: resolvedChannel.channel,
      target: resolvedChannel.target,
      code: challenge.code,
      expiresAt: challenge.expiresAt,
      locale: input.locale,
    });

    this.securityAuditService.logAsync({
      action: 'auth.practitioner.login.success',
      outcome: SecurityAuditOutcome.SUCCESS,
      actorUserId: userEmail.user.id,
      actorRoles: [UserRoleType.PRACTITIONER],
      metadata: {
        challengeId: challenge.challengeId,
        channel: challenge.channel,
      },
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
    });

    return {
      nextStep: 'OTP_REQUIRED' as const,
      challengeId: challenge.challengeId,
      channel: challenge.channel,
      maskedTarget: challenge.maskedTarget,
      expiresAt: challenge.expiresAt,
      requiresOtpVerification: true,
    };
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
      AUTH_LOCKOUT_CONTEXTS.PRACTITIONER_PASSWORD_LOGIN,
      input.subject,
    );

    this.securityAuditService.logAsync({
      action: 'auth.practitioner.login.failure',
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
