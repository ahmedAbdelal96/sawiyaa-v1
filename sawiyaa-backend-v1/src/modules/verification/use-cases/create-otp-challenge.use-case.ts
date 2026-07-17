import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { OtpChannel, OtpPurpose, Prisma } from '@prisma/client';
import { OtpChallengeRepository } from '../repositories/otp-challenge.repository';
import { OtpCodeGeneratorService } from '../services/otp-code-generator.service';
import { OtpHashService } from '../services/otp-hash.service';
import { OtpPolicyResolverService } from '../services/otp-policy-resolver.service';
import { maskTarget } from '../utils/mask-target.util';
import { OtpResendCooldownException } from '../exceptions/otp-cooldown.exception';

const OTP_SUPERSEDE_REASON = 'SUPERSEDED_BY_NEW_OTP';

/**
 * Creates an OTP challenge according to policy and persists it with hashed code.
 */
@Injectable()
export class CreateOtpChallengeUseCase {
  private readonly logger = new Logger(CreateOtpChallengeUseCase.name);

  constructor(
    private readonly otpChallengeRepository: OtpChallengeRepository,
    private readonly otpCodeGeneratorService: OtpCodeGeneratorService,
    private readonly otpHashService: OtpHashService,
    private readonly otpPolicyResolverService: OtpPolicyResolverService,
  ) {}

  async execute(input: {
    userId?: string | null;
    sessionId?: string | null;
    purpose: OtpPurpose;
    channel: OtpChannel;
    target: string;
    metadata?: Record<string, unknown>;
    skipCooldown?: boolean;
  }) {
    const policy = this.otpPolicyResolverService.resolve(input.purpose);

    if (!policy.allowedChannels.includes(input.channel)) {
      throw new ServiceUnavailableException({
        messageKey: 'auth.errors.verifiedOtpChannelRequired',
        error: 'OTP_CHANNEL_NOT_ALLOWED',
      });
    }

    if (!input.skipCooldown) {
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
        const mostRecent = recentChallenges[0];
        const resendAvailableAt = new Date(
          mostRecent.createdAt.getTime() + policy.resendCooldownSeconds * 1000,
        );
        const retryAfterSeconds = Math.max(
          0,
          Math.ceil((resendAvailableAt.getTime() - Date.now()) / 1000),
        );
        throw new OtpResendCooldownException(retryAfterSeconds, resendAvailableAt);
      }
    }

    const code = this.otpCodeGeneratorService.generate(policy.codeLength);
    const expiresAt = new Date(Date.now() + policy.ttlMinutes * 60 * 1000);

    const challenge = await this.otpChallengeRepository.withTransaction(
      async (tx) => {
        if (input.userId && input.purpose === OtpPurpose.PRACTITIONER_LOGIN) {
          const scopeKey = `otp-challenge:${input.purpose}:user:${input.userId}`;
          await this.otpChallengeRepository.lockScope(tx, scopeKey);
          await this.otpChallengeRepository.invalidateActiveChallengesByScope(
            {
              userId: input.userId,
              purpose: input.purpose,
              reason: OTP_SUPERSEDE_REASON,
            },
            tx,
          );
        }

        return this.otpChallengeRepository.create(
          {
            user: input.userId ? { connect: { id: input.userId } } : undefined,
            sessionId: input.sessionId ?? undefined,
            purpose: input.purpose,
            channel: input.channel,
            target: input.target,
            codeHash: this.otpHashService.hash(code),
            expiresAt,
            maxAttempts: policy.maxAttempts,
            metadata: input.metadata
              ? (input.metadata as Prisma.InputJsonValue)
              : undefined,
          },
          tx,
        );
      },
    );

    this.logger.log(
      `OTP challenge created (${input.purpose}) for ${maskTarget(input.target)}`,
    );

    return {
      challengeId: challenge.id,
      channel: input.channel,
      maskedTarget: maskTarget(input.target),
      expiresAt,
      code,
      target: input.target,
    };
  }
}
