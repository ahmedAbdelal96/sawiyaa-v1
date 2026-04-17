import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OtpChannel, OtpPurpose } from '@prisma/client';
import { OtpPolicy } from '../types/otp.types';

/**
 * Central resolver for OTP policies based on purpose.
 * Keeps TTL, attempts, and channel allowance out of business-specific flows.
 */
@Injectable()
export class OtpPolicyResolverService {
  constructor(private readonly configService: ConfigService) {}

  resolve(purpose: OtpPurpose): OtpPolicy {
    const codeLength = this.configService.get<number>('auth.otp.codeLength', 6);
    const maxAttempts = this.configService.get<number>('auth.otp.maxAttempts', 5);
    const resendCooldownSeconds = this.configService.get<number>(
      'auth.otp.resendCooldownSeconds',
      30,
    );

    switch (purpose) {
      case OtpPurpose.PRACTITIONER_LOGIN:
      case OtpPurpose.PATIENT_LOGIN:
      // Legacy value kept for backward compatibility.
      case OtpPurpose.LOGIN:
        return {
          purpose,
          codeLength,
          maxAttempts,
          resendCooldownSeconds,
          ttlMinutes: this.configService.get<number>(
            'auth.otp.loginTtlMinutes',
            10,
          ),
          allowedChannels: [OtpChannel.EMAIL, OtpChannel.SMS],
        };
      case OtpPurpose.PASSWORD_RESET:
      // Legacy value kept for backward compatibility.
      case OtpPurpose.RESET_PASSWORD:
        return {
          purpose,
          codeLength,
          maxAttempts,
          resendCooldownSeconds,
          ttlMinutes: this.configService.get<number>(
            'auth.otp.resetPasswordTtlMinutes',
            15,
          ),
          allowedChannels: [OtpChannel.EMAIL],
        };
      case OtpPurpose.EMAIL_VERIFICATION:
      // Legacy value kept for backward compatibility.
      case OtpPurpose.VERIFY_EMAIL:
        return {
          purpose,
          codeLength,
          maxAttempts,
          resendCooldownSeconds,
          ttlMinutes: 10,
          allowedChannels: [OtpChannel.EMAIL],
        };
      case OtpPurpose.PHONE_VERIFICATION:
      // Legacy value kept for backward compatibility.
      case OtpPurpose.VERIFY_PHONE:
        return {
          purpose,
          codeLength,
          maxAttempts,
          resendCooldownSeconds,
          ttlMinutes: 10,
          allowedChannels: [OtpChannel.SMS],
        };
      case OtpPurpose.ADMIN_STEP_UP:
      case OtpPurpose.SENSITIVE_ACTION_CONFIRMATION:
      case OtpPurpose.SETTLEMENT_CONFIRMATION:
        return {
          purpose,
          codeLength,
          maxAttempts,
          resendCooldownSeconds,
          ttlMinutes: 5,
          allowedChannels: [OtpChannel.EMAIL],
        };
      default:
        return {
          purpose,
          codeLength,
          maxAttempts,
          resendCooldownSeconds,
          ttlMinutes: 10,
          allowedChannels: [OtpChannel.EMAIL],
        };
    }
  }
}
