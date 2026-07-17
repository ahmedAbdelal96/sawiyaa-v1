import {
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { OtpPurpose } from '@prisma/client';
import { OtpChallengeRepository } from '../repositories/otp-challenge.repository';
import { OtpHashService } from '../services/otp-hash.service';

const OTP_SUPERSEDED_ERROR = {
  messageKey: 'auth.errors.otpChallengeSuperseded',
  error: 'OTP_CHALLENGE_SUPERSEDED',
} as const;

const OTP_ALREADY_USED_ERROR = {
  messageKey: 'auth.errors.otpChallengeAlreadyUsed',
  error: 'OTP_ALREADY_USED',
} as const;

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
    onInvalidCodeAttempt?: (challenge: {
      id: string;
      user: { id: string };
      purpose: OtpPurpose;
    }) => Promise<void> | void;
  }) {
    const initialChallenge =
      input.challengeId != null
        ? await this.otpChallengeRepository.findById(input.challengeId)
        : input.userId
          ? await this.otpChallengeRepository.findLatestActiveByUserId(
              input.userId,
              input.purpose,
            )
          : null;

    if (!initialChallenge || initialChallenge.purpose !== input.purpose) {
      this.logger.warn(`OTP challenge invalid or expired (${input.purpose})`);
      throw new UnauthorizedException({
        messageKey: 'auth.errors.otpChallengeInvalid',
        error: 'OTP_CHALLENGE_INVALID',
      });
    }

    return this.otpChallengeRepository.withTransaction(async (tx) => {
      const scopeKey = initialChallenge.userId
        ? `otp-challenge:${input.purpose}:user:${initialChallenge.userId}`
        : `otp-challenge:${input.purpose}:target:${initialChallenge.target}`;
      await this.otpChallengeRepository.lockScope(tx, scopeKey);

      const challenge = await this.otpChallengeRepository.findById(
        initialChallenge.id,
        tx,
      );

      if (!challenge || challenge.purpose !== input.purpose) {
        this.logger.warn(`OTP challenge invalid or expired (${input.purpose})`);
        throw new UnauthorizedException({
          messageKey: 'auth.errors.otpChallengeInvalid',
          error: 'OTP_CHALLENGE_INVALID',
        });
      }

      const latestActive = challenge.userId
        ? await this.otpChallengeRepository.findLatestActiveByUserId(
            challenge.userId,
            input.purpose,
            tx,
          )
        : await this.otpChallengeRepository.findLatestActiveByTarget(
            challenge.target,
            input.purpose,
            tx,
          );

      if (latestActive && latestActive.id !== challenge.id) {
        this.logger.warn(`OTP challenge superseded (${input.purpose})`);
        throw new ForbiddenException(OTP_SUPERSEDED_ERROR);
      }

      if (challenge.consumedAt) {
        this.logger.warn(`OTP challenge already used (${input.purpose})`);
        throw new ForbiddenException(OTP_ALREADY_USED_ERROR);
      }

      if (challenge.invalidatedAt) {
        this.logger.warn(`OTP challenge invalid or expired (${input.purpose})`);
        throw new UnauthorizedException({
          messageKey: 'auth.errors.otpChallengeInvalid',
          error: 'OTP_CHALLENGE_INVALID',
        });
      }

      if (challenge.expiresAt <= new Date()) {
        this.logger.warn(`OTP challenge invalid or expired (${input.purpose})`);
        throw new UnauthorizedException({
          messageKey: 'auth.errors.otpChallengeInvalid',
          error: 'OTP_CHALLENGE_INVALID',
        });
      }

      if (challenge.attemptCount >= challenge.maxAttempts) {
        await this.otpChallengeRepository.invalidate(challenge.id, tx);
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
          tx,
        );
        if (input.onInvalidCodeAttempt && challenge.user) {
          await input.onInvalidCodeAttempt({
            id: challenge.id,
            user: {
              id: challenge.user.id,
            },
            purpose: challenge.purpose,
          });
        }
        if (updated.attemptCount >= updated.maxAttempts) {
          await this.otpChallengeRepository.invalidate(updated.id, tx);
          this.logger.warn(
            `OTP invalidated after max attempts (${input.purpose})`,
          );
        }
        throw new ForbiddenException({
          messageKey: 'auth.errors.otpCodeInvalid',
          error: 'OTP_CODE_INVALID',
        });
      }

      await this.otpChallengeRepository.consume(challenge.id, tx);
      if (challenge.userId) {
        await this.otpChallengeRepository.invalidateActiveChallengesByScope(
          {
            userId: challenge.userId,
            purpose: input.purpose,
            reason: 'VERIFIED_CHALLENGE_CLEARED',
          },
          tx,
        );
      }
      this.logger.log(`OTP challenge verified (${input.purpose})`);
      return challenge;
    });
  }
}
