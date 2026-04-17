import {
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { OtpPurpose } from '@prisma/client';
import { OtpChallengeRepository } from '../repositories/otp-challenge.repository';
import { OtpHashService } from '../services/otp-hash.service';

/**
 * Verifies an OTP challenge by id or by user and purpose.
 * Handles attempt counting, max-attempt enforcement, and consumption.
 */
@Injectable()
export class VerifyOtpChallengeUseCase {
  private readonly logger = new Logger(VerifyOtpChallengeUseCase.name);
  constructor(
    private readonly otpChallengeRepository: OtpChallengeRepository,
    private readonly otpHashService: OtpHashService,
  ) {}

  async execute(input: {
    challengeId?: string;
    userId?: string;
    code: string;
    purpose: OtpPurpose;
  }) {
    const challenge =
      input.challengeId != null
        ? await this.otpChallengeRepository.findActiveById(input.challengeId)
        : input.userId
          ? await this.otpChallengeRepository.findLatestActiveByUserId(
              input.userId,
              input.purpose,
            )
          : null;

    if (!challenge || challenge.purpose !== input.purpose) {
      this.logger.warn(`OTP challenge invalid or expired (${input.purpose})`);
      throw new UnauthorizedException({
        messageKey: 'auth.errors.otpChallengeInvalid',
        error: 'OTP_CHALLENGE_INVALID',
      });
    }

    if (challenge.attemptCount >= challenge.maxAttempts) {
      await this.otpChallengeRepository.invalidate(challenge.id);
      this.logger.warn(`OTP max attempts exceeded (${input.purpose})`);
      throw new ForbiddenException({
        messageKey: 'auth.errors.otpCodeInvalid',
        error: 'OTP_MAX_ATTEMPTS_EXCEEDED',
      });
    }

    const hashedInput = this.otpHashService.hash(input.code);
    if (hashedInput !== challenge.codeHash) {
      const updated = await this.otpChallengeRepository.incrementAttemptCount(
        challenge.id,
      );
      if (updated.attemptCount >= updated.maxAttempts) {
        await this.otpChallengeRepository.invalidate(updated.id);
        this.logger.warn(`OTP invalidated after max attempts (${input.purpose})`);
      }
      throw new ForbiddenException({
        messageKey: 'auth.errors.otpCodeInvalid',
        error: 'OTP_CODE_INVALID',
      });
    }

    await this.otpChallengeRepository.consume(challenge.id);
    this.logger.log(`OTP challenge verified (${input.purpose})`);
    return challenge;
  }
}
