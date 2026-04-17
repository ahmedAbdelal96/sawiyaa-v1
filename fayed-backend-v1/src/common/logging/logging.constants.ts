export const LOGGING_SENSITIVE_KEYS = [
  'password',
  'passwordHash',
  'refreshToken',
  'accessToken',
  'token',
  'authorization',
  'cookie',
  'set-cookie',
  'otp',
  'otpCode',
  'jwt',
  'secret',
  'webhookSecret',
  'hmac',
] as const;

export const REQUEST_ID_HEADER = 'x-request-id';
