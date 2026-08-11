import { z } from 'zod';

const baseEnvSchema = z.object({
  // App
  APP_ENV: z.enum(['development', 'test', 'staging', 'production']).optional(),
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z.coerce.number().default(3000),
  APP_NAME: z.string().default('sawiyaa-backend-v1'),
  SERVICE_NAME: z.string().optional(),
  APP_URL: z.string().url(),
  APP_BASE_URL: z.string().url().optional(),
  // Public Web application origin used only for safe, stable links in
  // transactional messages. Provider room URLs are never used here.
  WEB_APP_URL: z.string().url().optional(),
  CORS_ORIGINS: z
    .string()
    .default(
      'http://localhost:3000,http://127.0.0.1:3000,http://localhost:8081,http://127.0.0.1:8081',
    ),
  CONFIG_HTTP_ENABLED: z.enum(['true', 'false']).default('false'),
  CONFIG_HTTP_TOKEN: z.string().optional(),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug', 'verbose']).optional(),
  LOG_PRETTY: z.enum(['true', 'false']).optional(),
  LOG_HTTP_ENABLED: z.enum(['true', 'false']).default('true'),
  LOG_FILE_ENABLED: z.enum(['true', 'false']).default('true'),
  LOG_CONSOLE_ENABLED: z.enum(['true', 'false']).default('true'),
  LOG_STACK_ENABLED: z.enum(['true', 'false']).optional(),
  LOG_NEST_INTERNAL_ENABLED: z.enum(['true', 'false']).default('false'),
  LOG_DIR: z.string().default('logs'),
  LOG_SLOW_REQUEST_MS: z.coerce.number().int().nonnegative().default(1000),
  LOG_RETENTION_DAYS: z.coerce.number().int().nonnegative().default(30),
  LOG_MAX_FILE_SIZE: z
    .string()
    .regex(/^\d+(?:\.\d+)?\s*(?:b|kb|mb|gb)?$/i)
    .default('20m'),

  SESSION_COMPLETION_CONFIRMATION_SWEEPER_ENABLED: z
    .enum(['true', 'false'])
    .default('true'),

  // Practitioner weekly session schedule
  AVAILABILITY_FUTURE_WEEKS_ALLOWED: z.coerce
    .number()
    .int()
    .min(1)
    .max(12)
    .default(4),
  AVAILABILITY_RETENTION_MONTHS: z.coerce.number().int().positive().default(12),
  AVAILABILITY_REPEAT_PREVIEW_TTL_MINUTES: z.coerce
    .number()
    .int()
    .min(1)
    .max(60)
    .default(10),

  // Trusted customer country resolution. GeoIP is optional and unknown always
  // falls back to USD through the central payment-region resolver.
  GEOIP_ENABLED: z.enum(['true', 'false']).default('false'),
  GEOIP_DATABASE_PATH: z.string().optional(),
  TRUSTED_PROXY_MODE: z.enum(['none', 'single', 'cloudflare']).default('none'),
  CLOUDFLARE_COUNTRY_HEADER_ENABLED: z.enum(['true', 'false']).default('false'),

  // Throttling / Rate limit store
  THROTTLE_STORE: z.enum(['memory', 'redis']).default('memory'),
  REDIS_URL: z.string().url().optional(),
  THROTTLE_KEY_PREFIX: z.string().default('sawiyaa:throttle'),
  THROTTLE_KEY_HASH_SECRET: z.string().optional(),

  // Database
  DATABASE_URL: z.string().url(),

  // JWT
  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  JWT_ISSUER: z.string().default('sawiyaa-backend-v1'),
  AUTH_PASSWORD_SALT_ROUNDS: z.coerce.number().int().min(8).max(15).default(12),
  AUTH_LOCKOUT_MAX_ATTEMPTS: z.coerce.number().int().min(1).max(20).default(5),
  AUTH_LOCKOUT_DURATION_MINUTES: z.coerce
    .number()
    .int()
    .min(1)
    .max(1440)
    .default(15),
  AUTH_PASSWORD_LOCKOUT_MAX_ATTEMPTS: z.coerce
    .number()
    .int()
    .min(1)
    .max(20)
    .optional(),
  AUTH_PASSWORD_LOCKOUT_DURATION_MINUTES: z.coerce
    .number()
    .int()
    .min(1)
    .max(1440)
    .optional(),
  AUTH_OTP_LOCKOUT_MAX_ATTEMPTS: z.coerce
    .number()
    .int()
    .min(1)
    .max(20)
    .optional(),
  AUTH_OTP_LOCKOUT_DURATION_MINUTES: z.coerce
    .number()
    .int()
    .min(1)
    .max(1440)
    .optional(),
  AUTH_OTP_CODE_LENGTH: z.coerce.number().int().min(4).max(8).default(6),
  AUTH_LOGIN_OTP_TTL_MINUTES: z.coerce
    .number()
    .int()
    .min(1)
    .max(30)
    .default(10),
  AUTH_RESET_PASSWORD_TTL_MINUTES: z.coerce
    .number()
    .int()
    .min(5)
    .max(60)
    .default(15),
  AUTH_OTP_MAX_ATTEMPTS: z.coerce.number().int().min(3).max(10).default(5),
  AUTH_OTP_RESEND_COOLDOWN_SECONDS: z.coerce
    .number()
    .int()
    .min(5)
    .max(300)
    .default(30),
  AUTH_COOKIE_AUTH_ENABLED: z.enum(['true', 'false']).optional(),
  AUTH_CSRF_ENFORCEMENT_ENABLED: z.enum(['true', 'false']).optional(),
  AUTH_CSRF_COOKIE_NAME: z.string().default('sawiyaa_csrf_token'),
  AUTH_CSRF_HEADER_NAME: z.string().default('x-csrf-token'),
  // Practitioner login OTP feature toggle.
  // true  = require OTP after password login (default secure behavior).
  // false = emergency bypass; password login issues tokens directly.
  // This is the primary control for the practitioner login OTP flow.
  PRACTITIONER_LOGIN_OTP_REQUIRED: z.enum(['true', 'false']).optional(),
  // Explicit local/test-only OTP capture. Disabled by default and rejected in production.
  PRACTITIONER_OTP_QA_CAPTURE_ENABLED: z.enum(['true', 'false']).optional(),
  PRACTITIONER_OTP_QA_CAPTURE_ACCOUNTS: z.string().optional(),

  // Google Auth
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_CALLBACK_URL: z.string().optional(),

  // Mail / SMS
  MAIL_PROVIDER: z.enum(['smtp', 'brevo']).default('smtp'),
  MAIL_FROM: z.string().email().optional(),
  MAIL_HOST: z.string().optional(),
  MAIL_PORT: z.coerce.number().optional(),
  MAIL_USER: z.string().optional(),
  MAIL_PASS: z.string().optional(),
  MAIL_SECURE: z.enum(['true', 'false']).optional(),
  DEV_OTP_EMAIL_REDIRECT: z.string().optional(),
  DEV_OTP_BYPASS_DELIVERY_FAILURES: z.enum(['true', 'false']).optional(),
  PRACTITIONER_OTP_QA_CAPTURE_PATH: z.string().optional(),
  SMS_PROVIDER: z.string().optional(),

  // Brevo (Sendinblue) transactional email
  BREVO_API_KEY: z.string().optional(),
  BREVO_API_URL: z.string().url().optional(),

  // Video - Daily
  VIDEO_PROVIDER_DEFAULT: z.enum(['DAILY']).default('DAILY'),
  DAILY_API_KEY: z.string().optional(),
  DAILY_API_BASE_URL: z.string().url().optional(),
  DAILY_WEBHOOK_SECRET: z.string().optional(),

  // Video - Zoom
  ZOOM_ACCOUNT_ID: z.string().optional(),
  ZOOM_CLIENT_ID: z.string().optional(),
  ZOOM_CLIENT_SECRET: z.string().optional(),

  // Payments - Stripe
  STRIPE_MODE: z.enum(['test', 'live']).default('test'),
  STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_API_BASE_URL: z.string().url().optional(),

  // Payments - Paymob
  PAYMOB_MODE: z.enum(['test', 'live']).default('test'),
  PAYMOB_API_KEY: z.string().optional(),
  PAYMOB_PUBLIC_KEY: z.string().optional(),
  PAYMOB_HMAC_SECRET: z.string().optional(),
  PAYMOB_INTEGRATION_ID: z.string().optional(),
  PAYMOB_INTEGRATION_ID_CARD: z.string().optional(),
  PAYMOB_INTEGRATION_ID_WALLET: z.string().optional(),
  PAYMOB_EGP_CARD_INTEGRATION_ID: z.string().optional(),
  PAYMOB_EGP_WALLET_INTEGRATION_ID: z.string().optional(),
  PAYMOB_USD_CARD_INTEGRATION_ID: z.string().optional(),
  PAYMOB_IFRAME_ID: z.string().optional(),
  PAYMOB_BASE_URL: z.string().url().optional(),
  PAYMOB_INTENTION_BASE_URL: z.string().url().optional(),
  PAYMOB_CHECKOUT_BASE_URL: z.string().url().optional(),
  PAYMENT_SUCCESS_URL: z.string().url().optional(),
  PAYMENT_FAILED_URL: z.string().url().optional(),
  PAYMENT_PENDING_URL: z.string().url().optional(),
  FINANCE_VAT_ENABLED: z.enum(['true', 'false']).default('false'),
  FINANCE_VAT_RATE_PERCENT: z.string().default('0'),
  FINANCE_GATEWAY_FEE_RATE_PERCENT: z.string().default('0'),
  FINANCE_GATEWAY_FEE_FIXED_AMOUNT: z.string().default('0'),

  // Sessions
  SESSION_PAYMENT_RESERVATION_MINUTES: z.coerce
    .number()
    .int()
    .min(1)
    .max(120)
    .default(15),
  SESSION_RUNTIME_PREPARE_LEAD_MINUTES: z.coerce
    .number()
    .int()
    .min(1)
    .max(10080)
    .default(1440),

  // Accounting reconciliation operations
  ACCOUNTING_RECONCILIATION_ENABLED: z.enum(['true', 'false']).default('false'),
  ACCOUNTING_RECONCILIATION_LOOKBACK_DAYS: z.coerce
    .number()
    .int()
    .min(1)
    .max(90)
    .default(7),
  ACCOUNTING_RECONCILIATION_BATCH_SIZE: z.coerce
    .number()
    .int()
    .min(10)
    .max(1000)
    .default(100),
  ACCOUNTING_RECONCILIATION_CRON: z.string().default('0 3 * * *'),
  ACCOUNTING_RECONCILIATION_ALERTS_ENABLED: z
    .enum(['true', 'false'])
    .default('false'),

  CORPORATE_CODE_PEPPER: z.string().min(32).optional(),
});

export const envSchema = baseEnvSchema.superRefine((env, ctx) => {
  const effectiveAppEnv = env.APP_ENV ?? env.NODE_ENV;
  const isProduction = effectiveAppEnv === 'production';

  // Reject localhost/loopback addresses in production to prevent silent push to wrong domain
  if (effectiveAppEnv === 'production' && env.APP_URL) {
    const url = env.APP_URL.toLowerCase();
    const localhostPattern =
      /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?(\/|$)/;
    if (localhostPattern.test(url)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['APP_URL'],
        message:
          'APP_URL cannot use localhost, 127.0.0.1, or 0.0.0.0 in production',
      });
    }
  }

  if (isProduction && !env.WEB_APP_URL?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['WEB_APP_URL'],
      message: 'WEB_APP_URL is required in production for transactional session links',
    });
  }

  if (isProduction && env.WEB_APP_URL) {
    const webUrl = env.WEB_APP_URL.toLowerCase();
    const localhostPattern =
      /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?(\/|$)/;
    if (localhostPattern.test(webUrl)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['WEB_APP_URL'],
        message:
          'WEB_APP_URL cannot use localhost, 127.0.0.1, or 0.0.0.0 in production',
      });
    }
  }

  if (env.THROTTLE_STORE === 'redis') {
    // Prefer fail-fast in prod; ThrottleStoreService also enforces this at runtime.
    if (effectiveAppEnv === 'production' && !env.REDIS_URL?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['REDIS_URL'],
        message:
          'REDIS_URL is required when THROTTLE_STORE=redis in production',
      });
    }
  }

  if (env.GEOIP_ENABLED === 'true' && !env.GEOIP_DATABASE_PATH?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['GEOIP_DATABASE_PATH'],
      message: 'GEOIP_DATABASE_PATH is required when GEOIP_ENABLED=true',
    });
  }

  if (
    env.CLOUDFLARE_COUNTRY_HEADER_ENABLED === 'true' &&
    env.TRUSTED_PROXY_MODE !== 'cloudflare'
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['TRUSTED_PROXY_MODE'],
      message:
        'TRUSTED_PROXY_MODE=cloudflare is required when Cloudflare country headers are enabled',
    });
  }

  if (!isProduction) {
    if (env.STRIPE_MODE === 'live') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['STRIPE_MODE'],
        message:
          'STRIPE_MODE must be test when APP_ENV/NODE_ENV is non-production',
      });
    }

    if (env.PAYMOB_MODE === 'live') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['PAYMOB_MODE'],
        message:
          'PAYMOB_MODE must be test when APP_ENV/NODE_ENV is non-production',
      });
    }
  }

  if (isProduction) {
    if (!env.DAILY_WEBHOOK_SECRET?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['DAILY_WEBHOOK_SECRET'],
        message:
          'DAILY_WEBHOOK_SECRET is required in production when Daily attendance webhooks are enabled',
      });
    }

    const publicUrls = [
      ['APP_URL', env.APP_URL],
      ['APP_BASE_URL', env.APP_BASE_URL],
      ['GOOGLE_CALLBACK_URL', env.GOOGLE_CALLBACK_URL],
      ['PAYMENT_SUCCESS_URL', env.PAYMENT_SUCCESS_URL],
      ['PAYMENT_FAILED_URL', env.PAYMENT_FAILED_URL],
      ['PAYMENT_PENDING_URL', env.PAYMENT_PENDING_URL],
      ['DAILY_API_BASE_URL', env.DAILY_API_BASE_URL],
    ] as const;
    for (const [name, value] of publicUrls) {
      if (!value) continue;
      const parsed = new URL(value);
      if (parsed.protocol !== 'https:') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [name],
          message: `${name} must use HTTPS in production`,
        });
      }
      if (/^(localhost|127\.0\.0\.1|0\.0\.0\.0)$/i.test(parsed.hostname)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [name],
          message: `${name} cannot use a local host in production`,
        });
      }
    }

    if (env.MAIL_PROVIDER === 'brevo') {
      if (!env.BREVO_API_KEY?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['BREVO_API_KEY'],
          message: 'BREVO_API_KEY is required when MAIL_PROVIDER=brevo',
        });
      }
      if (!env.MAIL_FROM) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['MAIL_FROM'],
          message: 'MAIL_FROM is required when MAIL_PROVIDER=brevo',
        });
      }
    } else {
      for (const name of ['MAIL_HOST', 'MAIL_USER', 'MAIL_PASS'] as const) {
        if (!env[name]?.trim()) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [name],
            message: `${name} is required when MAIL_PROVIDER=smtp`,
          });
        }
      }
      if (!env.MAIL_FROM) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['MAIL_FROM'],
          message: 'MAIL_FROM is required when MAIL_PROVIDER=smtp',
        });
      }
    }

    if (!env.DAILY_API_KEY?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['DAILY_API_KEY'],
        message: 'DAILY_API_KEY is required for the Daily video provider',
      });
    }
    if (!env.DAILY_API_BASE_URL) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['DAILY_API_BASE_URL'],
        message: 'DAILY_API_BASE_URL is required for the Daily video provider',
      });
    }
    if (!env.CORPORATE_CODE_PEPPER?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['CORPORATE_CODE_PEPPER'],
        message: 'CORPORATE_CODE_PEPPER is required in production',
      });
    }
  }

  if (
    env.DEV_OTP_EMAIL_REDIRECT?.trim() ||
    env.DEV_OTP_BYPASS_DELIVERY_FAILURES === 'true'
  ) {
    if (isProduction) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['DEV_OTP_EMAIL_REDIRECT'],
        message:
          'Development OTP delivery controls cannot be enabled in production',
      });
    }
  }

  if (env.PRACTITIONER_OTP_QA_CAPTURE_ENABLED === 'true') {
    if (effectiveAppEnv === 'production') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['PRACTITIONER_OTP_QA_CAPTURE_ENABLED'],
        message: 'Practitioner OTP QA capture cannot be enabled in production',
      });
    }
    if (!env.PRACTITIONER_OTP_QA_CAPTURE_ACCOUNTS?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['PRACTITIONER_OTP_QA_CAPTURE_ACCOUNTS'],
        message:
          'PRACTITIONER_OTP_QA_CAPTURE_ACCOUNTS is required when OTP QA capture is enabled',
      });
    }
  }
});

export type Env = z.infer<typeof envSchema>;

export function validate(config: Record<string, unknown>): Env {
  const result = envSchema.safeParse(config);

  if (!result.success) {
    const formatted = result.error.issues
      .map((issue) => `  ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(
      `\n[Env Validation] Invalid environment variables:\n${formatted}\n`,
    );
  }

  return result.data;
}
