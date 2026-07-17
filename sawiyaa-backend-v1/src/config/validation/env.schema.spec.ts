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
    PAYMENT_STRIPE_ENABLED: 'true',
    STRIPE_SECRET_KEY: 'sk_test_example',
    STRIPE_WEBHOOK_SECRET: 'whsec_example',
    STRIPE_API_BASE_URL: 'https://api.stripe.com',
    PAYMENT_SUCCESS_URL: 'http://localhost:3000/payment/success',
    PAYMENT_FAILED_URL: 'http://localhost:3000/payment/failed',
    PAYMENT_PENDING_URL: 'http://localhost:3000/payment/pending',
    PAYMENT_PAYMOB_ENABLED: 'false',
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
      validate(
        buildValidEnv({ PRACTITIONER_LOGIN_OTP_REQUIRED: 'maybe' }),
      ),
    ).toThrow(/PRACTITIONER_LOGIN_OTP_REQUIRED/);
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

  it('rejects missing redirect URL variables when payments are enabled', () => {
    expect(() =>
      validate(
        buildValidEnv({
          PAYMENT_SUCCESS_URL: '',
        }),
      ),
    ).toThrow(/PAYMENT_SUCCESS_URL is required/);
  });

  it('rejects missing paymob iframe when paymob is enabled', () => {
    expect(() =>
      validate(
        buildValidEnv({
          PAYMENT_PAYMOB_ENABLED: 'true',
          PAYMOB_MODE: 'test',
          PAYMOB_API_KEY: 'paymob_api',
          PAYMOB_HMAC_SECRET: 'paymob_hmac',
          PAYMOB_INTEGRATION_ID_CARD: '12345',
          PAYMOB_BASE_URL: 'https://accept.paymob.com/api',
          PAYMOB_IFRAME_ID: '',
        }),
      ),
    ).toThrow(/PAYMOB_IFRAME_ID is required/);
  });

  it('rejects missing paymob intention config when intention flow is enabled', () => {
    expect(() =>
      validate(
        buildValidEnv({
          PAYMENT_PAYMOB_ENABLED: 'true',
          PAYMOB_CHECKOUT_FLOW: 'intention',
          PAYMOB_MODE: 'test',
          PAYMOB_API_KEY: 'paymob_api',
          PAYMOB_HMAC_SECRET: 'paymob_hmac',
          PAYMOB_INTEGRATION_ID_CARD: '12345',
          PAYMOB_BASE_URL: 'https://accept.paymob.com/api',
          PAYMOB_CHECKOUT_BASE_URL: '',
          PAYMOB_INTENTION_BASE_URL: '',
          PAYMOB_PUBLIC_KEY: '',
        }),
      ),
    ).toThrow(/PAYMOB_PUBLIC_KEY is required/);
  });
});
