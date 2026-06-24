import { SetMetadata } from '@nestjs/common';
import { THROTTLE_POLICY_KEY } from '../constants/auth-metadata.constants';

/**
 * Labels a route as security-sensitive for future rate limiting.
 * Enforcement will be wired when Auth Module adds login/OTP/password-reset endpoints.
 */
export const ThrottlePolicy = (policyKey: string) =>
  SetMetadata(THROTTLE_POLICY_KEY, policyKey);
