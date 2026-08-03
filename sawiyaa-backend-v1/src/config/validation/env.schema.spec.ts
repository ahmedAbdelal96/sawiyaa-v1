import { validate } from './env.schema';

function buildValidEnv(overrides: Record<string, unknown> = {}) {
  return {
    APP_ENV: 'development',
    NODE_ENV: 'development',
    APP_URL: 'http://localhost:6001',
    APP_BASE_URL: 'http://localhost:3000',
    DATABASE_URL: 'postgresql://postgres:password@localhost:5432/fayed_db',
    JWT_ACCESS_SECRET: 'this_is_a_long_access_secret_123',
    JWT_REFRESH_SECRET: 'this_is_a_long_refresh_secret_123',
    STRIPE_MODE: 'test',
    STRIPE_SECRET_KEY: 'sk_test_example',
    STRIPE_WEBHOOK_SECRET: 'whsec_example',
    STRIPE_API_BASE_URL: 'https://api.stripe.com',
    PAYMENT_SUCCESS_URL: 'http://localhost:3000/payment/success',
    PAYMENT_FAILED_URL: 'http://localhost:3000/payment/failed',
    PAYMENT_PENDING_URL: 'http://localhost:3000/payment/pending',
    ...overrides,
  };
}

describe('env.schema payment validation', () => {
  it('accepts valid test-mode development payment configuration', () => {
    expect(() => validate(buildValidEnv())).not.toThrow();
  });

  it('accepts the secure default when practitioner OTP configuration is missing', () => {
    expect(() => validate(buildValidEnv())).not.toThrow();
  });

  it.each(['true', 'false'])(
    'accepts PRACTITIONER_LOGIN_OTP_REQUIRED=%s',
    (value) => {
      expect(() =>
        validate(buildValidEnv({ PRACTITIONER_LOGIN_OTP_REQUIRED: value })),
      ).not.toThrow();
    },
  );

  it('rejects a non-boolean practitioner OTP configuration value', () => {
    expect(() =>
      validate(buildValidEnv({ PRACTITIONER_LOGIN_OTP_REQUIRED: 'maybe' })),
    ).toThrow(/PRACTITIONER_LOGIN_OTP_REQUIRED/);
  });

  it('requires an allowlisted account for OTP QA capture', () => {
    expect(() =>
      validate(buildValidEnv({ PRACTITIONER_OTP_QA_CAPTURE_ENABLED: 'true' })),
    ).toThrow(/PRACTITIONER_OTP_QA_CAPTURE_ACCOUNTS/);
  });

  it('rejects OTP QA capture in production', () => {
    expect(() =>
      validate(
        buildValidEnv({
          APP_ENV: 'production',
          NODE_ENV: 'production',
          PRACTITIONER_OTP_QA_CAPTURE_ENABLED: 'true',
          PRACTITIONER_OTP_QA_CAPTURE_ACCOUNTS: 'qa@example.test',
        }),
      ),
    ).toThrow(/cannot be enabled in production/);
  });

  it('uses the safe availability defaults', () => {
    const env = validate(buildValidEnv());
    expect(env.AVAILABILITY_FUTURE_WEEKS_ALLOWED).toBe(4);
    expect(env.AVAILABILITY_RETENTION_MONTHS).toBe(12);
  });

  it('validates the session runtime preparation lead window', () => {
    expect(validate(buildValidEnv()).SESSION_RUNTIME_PREPARE_LEAD_MINUTES).toBe(
      1440,
    );
    expect(() =>
      validate(buildValidEnv({ SESSION_RUNTIME_PREPARE_LEAD_MINUTES: '0' })),
    ).toThrow(/SESSION_RUNTIME_PREPARE_LEAD_MINUTES/);
  });

  it('accepts availability environment overrides', () => {
    const env = validate(
      buildValidEnv({
        AVAILABILITY_FUTURE_WEEKS_ALLOWED: '6',
        AVAILABILITY_RETENTION_MONTHS: '24',
      }),
    );
    expect(env.AVAILABILITY_FUTURE_WEEKS_ALLOWED).toBe(6);
    expect(env.AVAILABILITY_RETENTION_MONTHS).toBe(24);
  });

  it('rejects unsafe availability limits', () => {
    expect(() =>
      validate(buildValidEnv({ AVAILABILITY_FUTURE_WEEKS_ALLOWED: '13' })),
    ).toThrow(/AVAILABILITY_FUTURE_WEEKS_ALLOWED/);
    expect(() =>
      validate(buildValidEnv({ AVAILABILITY_RETENTION_MONTHS: '0' })),
    ).toThrow(/AVAILABILITY_RETENTION_MONTHS/);
  });

  it('rejects live stripe mode in non-production environments', () => {
    expect(() =>
      validate(
        buildValidEnv({
          STRIPE_MODE: 'live',
        }),
      ),
    ).toThrow(/STRIPE_MODE must be test/);
  });

  it('accepts payment redirect URLs as optional infrastructure values', () => {
    expect(() =>
      validate(
        buildValidEnv({
          PAYMENT_SUCCESS_URL: undefined,
        }),
      ),
    ).not.toThrow();
  });

  it('does not require database-owned provider settings in ENV', () => {
    expect(() =>
      validate(
        buildValidEnv({
          PAYMOB_MODE: 'test',
          PAYMOB_IFRAME_ID: '',
        }),
      ),
    ).not.toThrow();
  });

  it('still rejects live payment modes outside production', () => {
    expect(() =>
      validate(
        buildValidEnv({
          PAYMOB_MODE: 'live',
        }),
      ),
    ).toThrow(/PAYMOB_MODE must be test/);
  });

  it('does not retain APP_DEFAULT_LOCALE as an ENV runtime setting', () => {
    const env = validate(buildValidEnv({ APP_DEFAULT_LOCALE: 'en' }));
    expect((env as Record<string, unknown>).APP_DEFAULT_LOCALE).toBeUndefined();
  });

  it('requires the selected Brevo provider contract in production', () => {
    expect(() =>
      validate(
        buildValidEnv({
          APP_ENV: 'production',
          NODE_ENV: 'production',
          APP_URL: 'https://api.example.com',
          APP_BASE_URL: 'https://www.example.com',
          PAYMENT_SUCCESS_URL: 'https://www.example.com/payment/success',
          PAYMENT_FAILED_URL: 'https://www.example.com/payment/failed',
          PAYMENT_PENDING_URL: 'https://www.example.com/payment/pending',
          MAIL_PROVIDER: 'brevo',
          MAIL_FROM: 'noreply@example.com',
          BREVO_API_KEY: 'brevo-key',
          BREVO_API_URL: 'https://api.brevo.com',
          DAILY_API_KEY: 'daily-key',
          DAILY_API_BASE_URL: 'https://api.daily.co/v1',
          CORPORATE_CODE_PEPPER: 'x'.repeat(32),
        }),
      ),
    ).not.toThrow();

    expect(() =>
      validate(
        buildValidEnv({
          APP_ENV: 'production',
          NODE_ENV: 'production',
          APP_URL: 'https://api.example.com',
          APP_BASE_URL: 'https://www.example.com',
          PAYMENT_SUCCESS_URL: 'https://www.example.com/payment/success',
          PAYMENT_FAILED_URL: 'https://www.example.com/payment/failed',
          PAYMENT_PENDING_URL: 'https://www.example.com/payment/pending',
          MAIL_PROVIDER: 'brevo',
          MAIL_FROM: 'noreply@example.com',
          DAILY_API_KEY: 'daily-key',
          DAILY_API_BASE_URL: 'https://api.daily.co/v1',
          CORPORATE_CODE_PEPPER: 'x'.repeat(32),
        }),
      ),
    ).toThrow(/BREVO_API_KEY/);
  });

  it('rejects unsafe production OTP controls and development URLs', () => {
    expect(() =>
      validate(
        buildValidEnv({
          APP_ENV: 'production',
          NODE_ENV: 'production',
          APP_URL: 'https://api.example.com',
          APP_BASE_URL: 'https://www.example.com',
          PAYMENT_SUCCESS_URL: 'https://www.example.com/payment/success',
          PAYMENT_FAILED_URL: 'https://www.example.com/payment/failed',
          PAYMENT_PENDING_URL: 'https://www.example.com/payment/pending',
          DEV_OTP_EMAIL_REDIRECT: 'qa@example.com',
          MAIL_PROVIDER: 'smtp',
          MAIL_FROM: 'noreply@example.com',
          MAIL_HOST: 'smtp.example.com',
          MAIL_USER: 'smtp-user',
          MAIL_PASS: 'smtp-pass',
          DAILY_API_KEY: 'daily-key',
          DAILY_API_BASE_URL: 'http://localhost:4444',
          CORPORATE_CODE_PEPPER: 'x'.repeat(32),
        }),
      ),
    ).toThrow(/production|HTTPS/i);
  });
});
