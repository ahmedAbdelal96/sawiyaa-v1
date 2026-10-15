import { registerAs } from '@nestjs/config';

function readInteger(name: string, fallback: number): number {
  const value = Number.parseInt(process.env[name] ?? '', 10);
  return Number.isFinite(value) ? value : fallback;
}

function readOptionalNumber(name: string): number | null {
  const raw = process.env[name]?.trim();
  if (!raw) return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

export default registerAs('notification', () => ({
  web: {
    // Development is an explicit local-testing environment. Every deployed
    // environment must configure this to the public Sawiyaa web origin.
    publicUrl:
      process.env.WEB_APP_URL ??
      (process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : null),
  },
  mail: {
    provider: process.env.MAIL_PROVIDER,
    from: process.env.MAIL_FROM,
    devOtpEmailRedirect: process.env.DEV_OTP_EMAIL_REDIRECT,
    devOtpBypassDeliveryFailures:
      process.env.DEV_OTP_BYPASS_DELIVERY_FAILURES === 'true',
    smtp: {
      host: process.env.MAIL_HOST,
      port: process.env.MAIL_PORT ? parseInt(process.env.MAIL_PORT, 10) : 587,
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS,
      secure: process.env.MAIL_SECURE === 'true',
    },
  },
  sms: {
    provider: process.env.SMS_PROVIDER,
  },
  brevo: {
    apiKey: process.env.BREVO_API_KEY,
    apiUrl: process.env.BREVO_API_URL ?? 'https://api.brevo.com',
  },
  capacity: {
    mode: process.env.NOTIFICATION_CAPACITY_MODE ?? 'METRICS_ONLY',
    brevoMaxConcurrency: readInteger('NOTIFICATION_BREVO_MAX_CONCURRENCY', 1),
    expoMaxConcurrency: readInteger('NOTIFICATION_EXPO_MAX_CONCURRENCY', 1),
    smtpMaxConcurrency: readInteger('NOTIFICATION_SMTP_MAX_CONCURRENCY', 1),
    coordinator: {
      redisUrl: process.env.NOTIFICATION_CAPACITY_REDIS_URL,
      keyPrefix:
        process.env.NOTIFICATION_CAPACITY_KEY_PREFIX ??
        'sawiyaa:notification-capacity',
      connectionTimeoutMs: readInteger(
        'NOTIFICATION_CAPACITY_REDIS_CONNECTION_TIMEOUT_MS',
        1_000,
      ),
      stateTtlMs: readInteger('NOTIFICATION_CAPACITY_STATE_TTL_MS', 120_000),
      maxCooldownMs: readInteger(
        'NOTIFICATION_CAPACITY_MAX_COOLDOWN_MS',
        3_600_000,
      ),
      brevoRequestsPerSecond: readOptionalNumber(
        'NOTIFICATION_BREVO_REQUESTS_PER_SECOND',
      ),
      brevoBurst: readOptionalNumber('NOTIFICATION_BREVO_BURST'),
      expoMessagesPerSecond: readOptionalNumber(
        'NOTIFICATION_EXPO_MESSAGES_PER_SECOND',
      ),
      expoBurst: readOptionalNumber('NOTIFICATION_EXPO_BURST'),
      smtpSendsPerSecond: readOptionalNumber(
        'NOTIFICATION_SMTP_SENDS_PER_SECOND',
      ),
      smtpBurst: readOptionalNumber('NOTIFICATION_SMTP_BURST'),
    },
  },
}));
