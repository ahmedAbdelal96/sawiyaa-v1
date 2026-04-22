import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { OtpChannel, OtpPurpose } from '@prisma/client';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { OtpChallengeRepository } from '../repositories/otp-challenge.repository';
import { OtpPolicyResolverService } from '../services/otp-policy-resolver.service';
import { CreateOtpChallengeUseCase } from './create-otp-challenge.use-case';
import { SendOtpChallengeUseCase } from './send-otp-challenge.use-case';

/**
 * Resends an OTP challenge while enforcing cooldown policies.
 * The latest active challenge is invalidated before issuing a new one.
 */
@Injectable()
export class ResendOtpChallengeUseCase {
  private readonly logger = new Logger(ResendOtpChallengeUseCase.name);
  constructor(
    private readonly otpChallengeRepository: OtpChallengeRepository,
    private readonly otpPolicyResolverService: OtpPolicyResolverService,
    private readonly createOtpChallengeUseCase: CreateOtpChallengeUseCase,
    private readonly sendOtpChallengeUseCase: SendOtpChallengeUseCase,
  ) {}

  async execute(input: {
    userId?: string | null;
    purpose: OtpPurpose;
    channel: OtpChannel;
    target: string;
    locale: SupportedLocale;
    metadata?: Record<string, unknown>;
  }) {
    const policy = this.otpPolicyResolverService.resolve(input.purpose);
    const cooldownStart = new Date(
      Date.now() - policy.resendCooldownSeconds * 1000,
    );

    const recentChallenges =
      await this.otpChallengeRepository.listRecentChallengesForTarget(
        input.target,
        input.purpose,
        cooldownStart,
      );

    if (recentChallenges.length > 0) {
      throw new BadRequestException({
        messageKey: 'auth.errors.otpResendTooSoon',
        error: 'OTP_RESEND_COOLDOWN',
      });
    }

    const latestActive =
      await this.otpChallengeRepository.findLatestActiveByTarget(
        input.target,
        input.purpose,
      );
    if (latestActive) {
      await this.otpChallengeRepository.invalidate(latestActive.id);
      this.logger.log(
        `OTP challenge invalidated before resend (${input.purpose})`,
      );
    }

    const challenge = await this.createOtpChallengeUseCase.execute({
      userId: input.userId ?? null,
      purpose: input.purpose,
      channel: input.channel,
      target: input.target,
      metadata: input.metadata,
      skipCooldown: true,
    });

    if (!input.userId) {
      throw new BadRequestException({
        messageKey: 'auth.errors.otpDeliveryFailed',
        error: 'OTP_USER_REQUIRED',
      });
    }

    this.logger.log(`OTP resend initiated (${input.purpose})`);

    await this.sendOtpChallengeUseCase.execute({
      userId: input.userId,
      purpose: input.purpose,
      channel: challenge.channel,
      target: challenge.target,
      code: challenge.code,
      expiresAt: challenge.expiresAt,
      locale: input.locale,
    });

    return challenge;
  }
}
