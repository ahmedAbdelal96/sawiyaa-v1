import { Injectable, Logger } from '@nestjs/common';
import { OtpChallengeRepository } from '../repositories/otp-challenge.repository';

/**
 * Invalidates an OTP challenge explicitly.
 * This is used when a flow needs to revoke older challenges after a resend
 * or when a business flow cancels the verification requirement.
 */
@Injectable()
export class InvalidateOtpChallengeUseCase {
  private readonly logger = new Logger(InvalidateOtpChallengeUseCase.name);
  constructor(
    private readonly otpChallengeRepository: OtpChallengeRepository,
  ) {}

  async execute(input: { challengeId: string }) {
    const result = await this.otpChallengeRepository.invalidate(
      input.challengeId,
    );
    this.logger.log(`OTP challenge invalidated (${input.challengeId})`);
    return result;
  }
}
