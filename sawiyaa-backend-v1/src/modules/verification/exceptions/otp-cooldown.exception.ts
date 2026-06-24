import { BadRequestException } from '@nestjs/common';

/**
 * Thrown when an OTP resend is attempted during the active cooldown window.
 * Carries machine-readable retry metadata so the API can return:
 *   { code: "OTP_RESEND_COOLDOWN_ACTIVE", retryAfterSeconds: 87, resendAvailableAt: "..." }
 */
export class OtpResendCooldownException extends BadRequestException {
  constructor(
    public readonly retryAfterSeconds: number,
    public readonly resendAvailableAt: Date,
  ) {
    super({
      messageKey: 'auth.errors.otpResendTooSoon',
      error: 'OTP_RESEND_COOLDOWN_ACTIVE',
      retryAfterSeconds,
      resendAvailableAt: resendAvailableAt.toISOString(),
    });
  }
}
