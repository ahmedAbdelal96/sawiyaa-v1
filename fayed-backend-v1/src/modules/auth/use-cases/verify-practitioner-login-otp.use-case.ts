import { ForbiddenException, Injectable } from '@nestjs/common';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import {
  OtpPurpose,
  PractitionerStatus,
  UserRoleType,
  UserStatus,
} from '@prisma/client';
import { IssueAuthTokensUseCase } from './issue-auth-tokens.use-case';
import { AuthSessionDeviceContext } from '../types/auth-session.types';
import { VerifyOtpChallengeUseCase } from '../../verification/use-cases/verify-otp-challenge.use-case';
import { UserRepository } from '../repositories/user.repository';

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
  ) {}

  async execute(input: {
    challengeId: string;
    code: string;
    deviceContext: AuthSessionDeviceContext;
    locale?: SupportedLocale;
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
      throw new ForbiddenException({
        messageKey: 'auth.errors.practitionerRoleRequired',
        error: 'PRACTITIONER_ROLE_REQUIRED',
      });
    }

    const currentUser = await this.userRepository.findByIdWithAuthContext(
      challenge.user.id,
    );

    if (!currentUser || currentUser.status !== UserStatus.ACTIVE) {
      throw new ForbiddenException({
        messageKey: 'auth.errors.accountNotActive',
        error: 'ACCOUNT_NOT_ACTIVE',
      });
    }

    if (!currentUser.practitionerProfile) {
      throw new ForbiddenException({
        messageKey: 'practitioners.errors.applicationNotEligible',
        error: 'PRACTITIONER_NOT_APPROVED',
      });
    }

    if (
      currentUser.practitionerProfile.status === PractitionerStatus.SUSPENDED ||
      currentUser.practitionerProfile.status === PractitionerStatus.INACTIVE
    ) {
      throw new ForbiddenException({
        messageKey: 'practitioners.errors.applicationNotEligible',
        error: 'PRACTITIONER_NOT_APPROVED',
      });
    }

    return this.issueAuthTokensUseCase.execute({
      userId: challenge.user.id,
      role: UserRoleType.PRACTITIONER,
      deviceContext: input.deviceContext,
    });
  }
}
