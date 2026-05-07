import { registerAs } from '@nestjs/config';

export default registerAs('auth', () => ({
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
    issuer: process.env.JWT_ISSUER ?? 'fayed-backend-v1',
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
  practitionerLoginOtpBypassInDev:
    process.env.AUTH_PRACTITIONER_LOGIN_OTP_BYPASS_IN_DEV === 'true',
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackUrl: process.env.GOOGLE_CALLBACK_URL,
  },
}));
