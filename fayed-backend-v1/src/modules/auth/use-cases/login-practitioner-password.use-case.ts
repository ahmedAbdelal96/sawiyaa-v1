import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import {
  OtpPurpose,
  PractitionerStatus,
  UserRoleType,
  UserStatus,
} from '@prisma/client';
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
  ) {}

  async execute(input: {
    email: string;
    password: string;
    locale: SupportedLocale;
    deviceContext: AuthSessionDeviceContext;
  }) {
    const normalizedEmail = input.email.trim().toLowerCase();
    const userEmail =
      await this.userEmailRepository.findByEmailForPractitionerAuth(
        normalizedEmail,
      );

    if (!userEmail) {
      throw new UnauthorizedException({
        messageKey: 'auth.errors.invalidCredentials',
        error: 'INVALID_CREDENTIALS',
      });
    }
    if (!userEmail.isPrimary) {
      throw new UnauthorizedException({
        messageKey: 'auth.errors.invalidCredentials',
        error: 'INVALID_CREDENTIALS',
      });
    }

    const hasPractitionerRole = userEmail.user.roles.some(
      (role) => role.role === UserRoleType.PRACTITIONER,
    );

    if (!hasPractitionerRole) {
      throw new ForbiddenException({
        messageKey: 'auth.errors.practitionerRoleRequired',
        error: 'PRACTITIONER_ROLE_REQUIRED',
      });
    }

    const practitionerProfile = userEmail.user.practitionerProfile;
    if (!practitionerProfile) {
      throw new ForbiddenException({
        messageKey: 'practitioners.errors.applicationNotEligible',
        error: 'PRACTITIONER_NOT_APPROVED',
      });
    }

    if (
      practitionerProfile.status === PractitionerStatus.SUSPENDED ||
      practitionerProfile.status === PractitionerStatus.INACTIVE
    ) {
      throw new ForbiddenException({
        messageKey: 'practitioners.errors.applicationNotEligible',
        error: 'PRACTITIONER_NOT_APPROVED',
      });
    }

    if (userEmail.user.status !== UserStatus.ACTIVE) {
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
      throw new UnauthorizedException({
        messageKey: 'auth.errors.invalidCredentials',
        error: 'INVALID_CREDENTIALS',
      });
    }

    const isDevelopmentEnvironment =
      this.configService.get<string>('app.nodeEnv') === 'development';
    const bypassPractitionerOtp =
      this.configService.get<boolean>(
        'auth.practitionerLoginOtpBypassInDev',
      ) === true;

    await this.authIdentityRepository.touchLastUsed(passwordIdentity.id);
    await this.practitionerPresenceRepository.markOnline(
      practitionerProfile.id,
    );

    if (isDevelopmentEnvironment && bypassPractitionerOtp) {
      const result = await this.issueAuthTokensUseCase.execute({
        userId: userEmail.user.id,
        role: UserRoleType.PRACTITIONER,
        deviceContext: input.deviceContext,
      });

      return result;
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

    return {
      challengeId: challenge.challengeId,
      channel: challenge.channel,
      maskedTarget: challenge.maskedTarget,
      expiresAt: challenge.expiresAt,
      requiresOtpVerification: true,
    };
  }
}
