import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { OtpChannel, OtpPurpose } from '@prisma/client';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { OtpChallengeRepository } from '../repositories/otp-challenge.repository';
import { OtpDeliveryDispatcherService } from '../services/otp-delivery-dispatcher.service';
import { maskTarget } from '../utils/mask-target.util';

/**
 * Dispatches an OTP challenge via the configured delivery channel.
 */
@Injectable()
export class SendOtpChallengeUseCase {
  private readonly logger = new Logger(SendOtpChallengeUseCase.name);

  constructor(
    private readonly otpChallengeRepository: OtpChallengeRepository,
    private readonly otpDeliveryDispatcherService: OtpDeliveryDispatcherService,
  ) {}

  async execute(input: {
    challengeId?: string;
    userId: string;
    purpose: OtpPurpose;
    channel: OtpChannel;
    target: string;
    code: string;
    expiresAt: Date;
    locale: SupportedLocale;
  }) {
    this.logger.log(
      `OTP delivery attempt (${input.purpose}) to ${maskTarget(input.target)}`,
    );

    const delivery = await this.otpDeliveryDispatcherService.dispatch({
      userId: input.userId,
      channel: input.channel,
      target: input.target,
      code: input.code,
      expiresAt: input.expiresAt,
      locale: input.locale,
      purposeLabel: input.purpose,
    });

    if (!delivery.delivered) {
      if (input.challengeId) {
        await this.otpChallengeRepository.invalidate(input.challengeId);
        this.logger.warn(
          `OTP delivery failed; challenge invalidated (${input.purpose})`,
        );
      }
      throw new ServiceUnavailableException({
        messageKey: 'auth.errors.otpDeliveryFailed',
        error: 'OTP_DELIVERY_FAILED',
      });
    }

    this.logger.log(`OTP delivery succeeded (${input.purpose})`);
    return delivery;
  }
}
