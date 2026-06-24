import { BadRequestException } from '@nestjs/common';

/**
 * Thrown when the per-email+role PASSWORD_RESET rate limit is exceeded.
 * Carries machine-readable metadata so the API can return:
 *   { code: "OTP_EMAIL_ROLE_RATE_LIMIT", retryAfterSeconds: N, reason: "EMAIL_ROLE_LIMIT_15MIN" }
 */
export class OtpEmailRoleRateLimitException extends BadRequestException {
  constructor(
    public readonly retryAfterSeconds: number,
    public readonly reason: 'EMAIL_ROLE_LIMIT_15MIN' | 'EMAIL_ROLE_LIMIT_24H',
  ) {
    super({
      messageKey: 'auth.errors.otpResendTooSoon',
      error: 'OTP_EMAIL_ROLE_RATE_LIMIT',
      retryAfterSeconds,
      reason,
    });
  }
}
