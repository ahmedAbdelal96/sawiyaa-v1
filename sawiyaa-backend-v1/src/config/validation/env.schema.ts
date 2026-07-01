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
  APP_DEFAULT_LOCALE: z.enum(['ar', 'en']).default('ar'),
  CORS_ORIGINS: z
    .string()
    .default(
      'http://localhost:3000,http://127.0.0.1:3000,http://localhost:8081,http://127.0.0.1:8081',
    ),
  CONFIG_HTTP_ENABLED: z.enum(['true', 'false']).default('false'),
  CONFIG_HTTP_TOKEN: z.string().optional(),
  LOG_LEVEL: z
    .enum(['error', 'warn', 'info', 'http', 'debug', 'verbose'])
    .optional(),
  LOG_PRETTY: z.enum(['true', 'false']).optional(),
  LOG_HTTP_ENABLED: z.enum(['true', 'false']).default('true'),
  LOG_FILE_ENABLED: z.enum(['true', 'false']).default('true'),
  LOG_CONSOLE_ENABLED: z.enum(['true', 'false']).default('true'),
  LOG_STACK_ENABLED: z.enum(['true', 'false']).optional(),
  LOG_NEST_INTERNAL_ENABLED: z.enum(['true', 'false']).default('false'),
  LOG_DIR: z.string().default('logs'),
  LOG_SLOW_REQUEST_MS: z.coerce.number().int().positive().default(1000),
  LOG_RETENTION_DAYS: z.coerce.number().int().positive().default(30),
  LOG_MAX_FILE_SIZE: z.string().default('20m'),

  // Throttling / Rate limit store
  THROTTLE_STORE: z.enum(['memory', 'redis']).default('memory'),
  REDIS_URL: z.string().url().optional(),
  THROTTLE_KEY_PREFIX: z.string().default('sawiyaa:throttle'),
  THROTTLE_KEY_HASH_SECRET: z.string().optional(),

  // Step-up (re-auth) enforcement for sensitive actions
  STEP_UP_ENABLED: z.enum(['true', 'false']).optional(),
  STEP_UP_TTL_SECONDS: z.coerce.number().int().min(60).max(3600).default(600),

  // Database
  DATABASE_URL: z.string().url(),

  // JWT
  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  JWT_ISSUER: z.string().default('sawiyaa-backend-v1'),
  AUTH_PASSWORD_SALT_ROUNDS: z.coerce.number().int().min(8).max(15).default(12),
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
  AUTH_PRACTITIONER_LOGIN_OTP_ENABLED: z.enum(['true', 'false']).optional(),
  // Legacy development-only bypass.
  // Prefer AUTH_PRACTITIONER_LOGIN_OTP_ENABLED=false instead.
  // Kept for backward compatibility with local dev setups.
  AUTH_PRACTITIONER_LOGIN_OTP_BYPASS_IN_DEV: z
    .enum(['true', 'false'])
    .optional(),

  // Google Auth
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_CALLBACK_URL: z.string().optional(),

  // Mail / SMS
  MAIL_PROVIDER: z.string().optional(),
  MAIL_FROM: z.string().optional(),
  MAIL_HOST: z.string().optional(),
  MAIL_PORT: z.coerce.number().optional(),
  MAIL_USER: z.string().optional(),
  MAIL_PASS: z.string().optional(),
  MAIL_SECURE: z.enum(['true', 'false']).optional(),
  DEV_OTP_EMAIL_REDIRECT: z.string().optional(),
  DEV_OTP_BYPASS_DELIVERY_FAILURES: z.enum(['true', 'false']).optional(),
  SMS_PROVIDER: z.string().optional(),

  // Brevo (Sendinblue) transactional email
  BREVO_API_KEY: z.string().optional(),
  BREVO_API_URL: z.string().url().optional(),

  // Video - Daily
  DAILY_API_KEY: z.string().optional(),
  DAILY_WEBHOOK_SECRET: z.string().optional(),

  // Video - Zoom
  ZOOM_ACCOUNT_ID: z.string().optional(),
  ZOOM_CLIENT_ID: z.string().optional(),
  ZOOM_CLIENT_SECRET: z.string().optional(),

  // Payments - Stripe
  PAYMENT_STRIPE_ENABLED: z.enum(['true', 'false']).default('false'),
  STRIPE_MODE: z.enum(['test', 'live']).default('test'),
  STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_API_BASE_URL: z.string().url().optional(),

  // Payments - Paymob
  PAYMENT_PAYMOB_ENABLED: z.enum(['true', 'false']).default('false'),
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
  PAYMOB_CHECKOUT_FLOW: z.enum(['legacy', 'intention']).default('legacy'),
  PAYMOB_DEFAULT_CHECKOUT_METHOD: z.string().optional(),
  PAYMOB_METHOD_REGISTRY_JSON: z.string().optional(),
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
});

export const envSchema = baseEnvSchema.superRefine((env, ctx) => {
  const effectiveAppEnv = env.APP_ENV ?? env.NODE_ENV;
  const anyProviderEnabled =
    env.PAYMENT_STRIPE_ENABLED === 'true' ||
    env.PAYMENT_PAYMOB_ENABLED === 'true';

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

  if (anyProviderEnabled) {
    if (!env.APP_BASE_URL?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['APP_BASE_URL'],
        message:
          'APP_BASE_URL is required when any payment provider is enabled',
      });
    }

    if (!env.PAYMENT_SUCCESS_URL?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['PAYMENT_SUCCESS_URL'],
        message:
          'PAYMENT_SUCCESS_URL is required when any payment provider is enabled',
      });
    }

    if (!env.PAYMENT_FAILED_URL?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['PAYMENT_FAILED_URL'],
        message:
          'PAYMENT_FAILED_URL is required when any payment provider is enabled',
      });
    }

    if (!env.PAYMENT_PENDING_URL?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['PAYMENT_PENDING_URL'],
        message:
          'PAYMENT_PENDING_URL is required when any payment provider is enabled',
      });
    }
  }

  if (effectiveAppEnv !== 'production') {
    if (env.PAYMENT_STRIPE_ENABLED === 'true' && env.STRIPE_MODE === 'live') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['STRIPE_MODE'],
        message:
          'STRIPE_MODE must be test when APP_ENV/NODE_ENV is non-production',
      });
    }

    if (env.PAYMENT_PAYMOB_ENABLED === 'true' && env.PAYMOB_MODE === 'live') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['PAYMOB_MODE'],
        message:
          'PAYMOB_MODE must be test when APP_ENV/NODE_ENV is non-production',
      });
    }
  }

  if (env.PAYMENT_STRIPE_ENABLED === 'true') {
    if (!env.STRIPE_API_BASE_URL?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['STRIPE_API_BASE_URL'],
        message:
          'STRIPE_API_BASE_URL is required when PAYMENT_STRIPE_ENABLED=true',
      });
    }

    if (!env.STRIPE_SECRET_KEY?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['STRIPE_SECRET_KEY'],
        message:
          'STRIPE_SECRET_KEY is required when PAYMENT_STRIPE_ENABLED=true',
      });
    }

    if (!env.STRIPE_WEBHOOK_SECRET?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['STRIPE_WEBHOOK_SECRET'],
        message:
          'STRIPE_WEBHOOK_SECRET is required when PAYMENT_STRIPE_ENABLED=true',
      });
    }
  }

  if (env.PAYMENT_PAYMOB_ENABLED === 'true') {
    if (!env.PAYMOB_BASE_URL?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['PAYMOB_BASE_URL'],
        message: 'PAYMOB_BASE_URL is required when PAYMENT_PAYMOB_ENABLED=true',
      });
    }

    if (!env.PAYMOB_API_KEY?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['PAYMOB_API_KEY'],
        message: 'PAYMOB_API_KEY is required when PAYMENT_PAYMOB_ENABLED=true',
      });
    }

    if (!env.PAYMOB_HMAC_SECRET?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['PAYMOB_HMAC_SECRET'],
        message:
          'PAYMOB_HMAC_SECRET is required when PAYMENT_PAYMOB_ENABLED=true',
      });
    }

    const checkoutFlow = env.PAYMOB_CHECKOUT_FLOW ?? 'legacy';
    const hasLegacyCardIntegration = Boolean(
      env.PAYMOB_INTEGRATION_ID_CARD?.trim() ||
      env.PAYMOB_INTEGRATION_ID?.trim(),
    );
    const hasExplicitEgpCardIntegration = Boolean(
      env.PAYMOB_EGP_CARD_INTEGRATION_ID?.trim(),
    );
    const hasExplicitEgpWalletIntegration = Boolean(
      env.PAYMOB_EGP_WALLET_INTEGRATION_ID?.trim(),
    );
    const hasExplicitUsdCardIntegration = Boolean(
      env.PAYMOB_USD_CARD_INTEGRATION_ID?.trim(),
    );
    const rawRegistry = env.PAYMOB_METHOD_REGISTRY_JSON?.trim();
    const hasRegistryJson = Boolean(rawRegistry);

    if (checkoutFlow === 'intention') {
      if (!env.PAYMOB_PUBLIC_KEY?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['PAYMOB_PUBLIC_KEY'],
          message:
            'PAYMOB_PUBLIC_KEY is required when PAYMOB_CHECKOUT_FLOW=intention',
        });
      }

      if (!env.PAYMOB_CHECKOUT_BASE_URL?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['PAYMOB_CHECKOUT_BASE_URL'],
          message:
            'PAYMOB_CHECKOUT_BASE_URL is required when PAYMOB_CHECKOUT_FLOW=intention',
        });
      }

      if (!env.PAYMOB_INTENTION_BASE_URL?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['PAYMOB_INTENTION_BASE_URL'],
          message:
            'PAYMOB_INTENTION_BASE_URL is required when PAYMOB_CHECKOUT_FLOW=intention',
        });
      }
    }

    if (
      !hasExplicitEgpCardIntegration &&
      !hasExplicitEgpWalletIntegration &&
      !hasExplicitUsdCardIntegration &&
      !hasLegacyCardIntegration &&
      !hasRegistryJson
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['PAYMOB_EGP_CARD_INTEGRATION_ID'],
        message:
          'At least one explicit Paymob currency/method integration id or a method registry is required when PAYMENT_PAYMOB_ENABLED=true',
      });
    }

    if (checkoutFlow === 'legacy' && !env.PAYMOB_IFRAME_ID?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['PAYMOB_IFRAME_ID'],
        message:
          'PAYMOB_IFRAME_ID is required when PAYMENT_PAYMOB_ENABLED=true and PAYMOB_CHECKOUT_FLOW=legacy',
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
