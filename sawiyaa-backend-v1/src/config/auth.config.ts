import { registerAs } from '@nestjs/config';

export default registerAs('auth', () => ({
  cookieAuthEnabled:
    process.env.AUTH_COOKIE_AUTH_ENABLED !== undefined
      ? process.env.AUTH_COOKIE_AUTH_ENABLED === 'true'
      : (process.env.NODE_ENV ?? 'development') !== 'production',
  csrf: {
    enforcementEnabled: process.env.AUTH_CSRF_ENFORCEMENT_ENABLED === 'true',
    cookieName: process.env.AUTH_CSRF_COOKIE_NAME ?? 'sawiyaa_csrf_token',
    headerName: process.env.AUTH_CSRF_HEADER_NAME ?? 'x-csrf-token',
  },
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
    issuer: process.env.JWT_ISSUER ?? 'sawiyaa-backend-v1',
  },
  password: {
    saltRounds: parseInt(process.env.AUTH_PASSWORD_SALT_ROUNDS ?? '12', 10),
  },
  otp: {
    codeLength: parseInt(process.env.AUTH_OTP_CODE_LENGTH ?? '6', 10),
    loginTtlMinutes: parseInt(
      process.env.AUTH_LOGIN_OTP_TTL_MINUTES ?? '10',
      10,
    ),
    resetPasswordTtlMinutes: parseInt(
      process.env.AUTH_RESET_PASSWORD_TTL_MINUTES ?? '15',
      10,
    ),
    maxAttempts: parseInt(process.env.AUTH_OTP_MAX_ATTEMPTS ?? '5', 10),
    resendCooldownSeconds: parseInt(
      process.env.AUTH_OTP_RESEND_COOLDOWN_SECONDS ?? '30',
      10,
    ),
  },
  // Primary feature toggle for practitioner login OTP.
  // Exposed as a tri-state string so the use-case can distinguish
  // "unset" (legacy fallback) from "explicitly true/false":
  //   'true'   → OTP required, never overridden by legacy flag
  //   'false'  → emergency bypass, works in any environment
  //   'unset'  → fallback to legacy dev-only bypass flag
  practitionerLoginOtpEnabledState:
    process.env.AUTH_PRACTITIONER_LOGIN_OTP_ENABLED === 'true'
      ? 'true'
      : process.env.AUTH_PRACTITIONER_LOGIN_OTP_ENABLED === 'false'
        ? 'false'
        : 'unset',
  // Legacy dev-only bypass. Used only when the new flag is unset.
  practitionerLoginOtpBypassInDev:
    process.env.AUTH_PRACTITIONER_LOGIN_OTP_BYPASS_IN_DEV === 'true',
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackUrl: process.env.GOOGLE_CALLBACK_URL,
  },
}));
