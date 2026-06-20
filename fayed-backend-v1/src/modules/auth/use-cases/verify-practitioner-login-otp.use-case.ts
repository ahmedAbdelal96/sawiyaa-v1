import { ForbiddenException, Injectable } from '@nestjs/common';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import {
  OtpPurpose,
  PractitionerStatus,
  SecurityAuditOutcome,
  UserRoleType,
  UserStatus,
} from '@prisma/client';
import { SecurityAuditService } from '@common/security-audit/security-audit.service';
import { IssueAuthTokensUseCase } from './issue-auth-tokens.use-case';
import { AuthSessionDeviceContext } from '../types/auth-session.types';
import { VerifyOtpChallengeUseCase } from '../../verification/use-cases/verify-otp-challenge.use-case';
import { UserRepository } from '../repositories/user.repository';
import { PractitionerPresenceRepository } from '@modules/presence/repositories/practitioner-presence.repository';

/**
 * Tokens are issued only after OTP verification succeeds.
 * This ensures practitioner routes can rely on a stronger authentication step than password alone.
 */
@Injectable()
export class VerifyPractitionerLoginOtpUseCase {
  constructor(
    private readonly verifyOtpChallengeUseCase: VerifyOtpChallengeUseCase,
    private readonly issueAuthTokensUseCase: IssueAuthTokensUseCase,
    private readonly userRepository: UserRepository,
    private readonly practitionerPresenceRepository: PractitionerPresenceRepository,
    private readonly securityAuditService: SecurityAuditService,
  ) {}

  async execute(input: {
    challengeId: string;
    code: string;
    deviceContext: AuthSessionDeviceContext;
    locale?: SupportedLocale;
    ipAddress?: string | null;
    userAgent?: string | null;
  }) {
    const challenge = await this.verifyOtpChallengeUseCase.execute({
      challengeId: input.challengeId,
      code: input.code,
      purpose: OtpPurpose.PRACTITIONER_LOGIN,
    });

    const hasPractitionerRole =
      challenge.user?.roles.some(
        (role) => role.role === UserRoleType.PRACTITIONER,
      ) ?? false;

    if (!challenge.user || !hasPractitionerRole) {
      this.securityAuditService.logAsync({
        action: 'auth.practitioner.login.failure',
        outcome: SecurityAuditOutcome.FAILURE,
        actorUserId: challenge.user?.id ?? null,
        actorRoles: challenge.user?.roles.map((r) => r.role) ?? [],
        reason: !challenge.user ? 'CHALLENGE_USER_NOT_FOUND' : 'PRACTITIONER_ROLE_REQUIRED',
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
      });
      throw new ForbiddenException({
        messageKey: 'auth.errors.practitionerRoleRequired',
        error: 'PRACTITIONER_ROLE_REQUIRED',
      });
    }

    const currentUser = await this.userRepository.findByIdWithAuthContext(
      challenge.user.id,
    );

    if (!currentUser || currentUser.status !== UserStatus.ACTIVE) {
      this.securityAuditService.logAsync({
        action: 'auth.practitioner.login.failure',
        outcome: SecurityAuditOutcome.FAILURE,
        actorUserId: challenge.user.id,
        actorRoles: challenge.user.roles.map((r) => r.role),
        reason: !currentUser ? 'USER_NOT_FOUND' : 'ACCOUNT_NOT_ACTIVE',
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
      });
      throw new ForbiddenException({
        messageKey: 'auth.errors.accountNotActive',
        error: 'ACCOUNT_NOT_ACTIVE',
      });
    }

    if (!currentUser.practitionerProfile) {
      this.securityAuditService.logAsync({
        action: 'auth.practitioner.login.failure',
        outcome: SecurityAuditOutcome.FAILURE,
        actorUserId: challenge.user.id,
        actorRoles: challenge.user.roles.map((r) => r.role),
        reason: 'PRACTITIONER_PROFILE_NOT_FOUND',
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
      });
      throw new ForbiddenException({
        messageKey: 'practitioners.errors.applicationNotEligible',
        error: 'PRACTITIONER_NOT_APPROVED',
      });
    }

    if (
      currentUser.practitionerProfile.status === PractitionerStatus.SUSPENDED ||
      currentUser.practitionerProfile.status === PractitionerStatus.INACTIVE
    ) {
      this.securityAuditService.logAsync({
        action: 'auth.practitioner.login.failure',
        outcome: SecurityAuditOutcome.FAILURE,
        actorUserId: challenge.user.id,
        actorRoles: challenge.user.roles.map((r) => r.role),
        reason: `PRACTITIONER_STATUS_${currentUser.practitionerProfile.status}`,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
      });
      throw new ForbiddenException({
        messageKey: 'practitioners.errors.applicationNotEligible',
        error: 'PRACTITIONER_NOT_APPROVED',
      });
    }

    const result = await this.issueAuthTokensUseCase.execute({
      userId: challenge.user.id,
      role: UserRoleType.PRACTITIONER,
      deviceContext: input.deviceContext,
    });

    await this.practitionerPresenceRepository.markOnline(
      currentUser.practitionerProfile.id,
    );

    this.securityAuditService.logAsync({
      action: 'auth.practitioner.login.success',
      outcome: SecurityAuditOutcome.SUCCESS,
      actorUserId: challenge.user.id,
      actorRoles: [UserRoleType.PRACTITIONER],
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
    });

    return result;
  }
}
