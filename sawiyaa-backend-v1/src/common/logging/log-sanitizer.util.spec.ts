import { redactUrlForLogging, sanitizeForLogging } from './log-sanitizer.util';

describe('redactUrlForLogging', () => {
  it('redacts sensitive query parameters while preserving the path', () => {
    expect(
      redactUrlForLogging(
        '/academy/enrollments/enrollment_1/payment-return?token=abc123&payment_token=pay_1&hmac=hash&publicAccessToken=pub_1&foo=bar',
      ),
    ).toBe(
      '/academy/enrollments/enrollment_1/payment-return?token=%5BREDACTED%5D&payment_token=%5BREDACTED%5D&hmac=%5BREDACTED%5D&publicAccessToken=%5BREDACTED%5D&foo=bar',
    );
  });

  it('redacts absolute urls too', () => {
    expect(
      redactUrlForLogging(
        'https://app.fayed.example/academy/enrollments/1/payment-return?token=abc123',
      ),
    ).toBe(
      'https://app.fayed.example/academy/enrollments/1/payment-return?token=%5BREDACTED%5D',
    );
  });

  it('redacts nested returnUrl values that contain sensitive query params', () => {
    expect(
      redactUrlForLogging(
        '/academy/enrollments/enrollment_1/pay/redirect?token=abc123&returnUrl=https%3A%2F%2Fapp.fayed.example%2Facademy%2Fenrollments%2Fenrollment_1%2Fpayment-return%3Ftoken%3Dpublic-token%26payment_token%3Dpay_1%26hmac%3Dhash%26publicAccessToken%3Dpub_1',
      ),
    ).toBe(
      '/academy/enrollments/enrollment_1/pay/redirect?token=%5BREDACTED%5D&returnUrl=https%3A%2F%2Fapp.fayed.example%2Facademy%2Fenrollments%2Fenrollment_1%2Fpayment-return%3Ftoken%3D%255BREDACTED%255D%26payment_token%3D%255BREDACTED%255D%26hmac%3D%255BREDACTED%255D%26publicAccessToken%3D%255BREDACTED%255D',
    );
  });
});

describe('sanitizeForLogging', () => {
  it('redacts sensitive credential fields deeply', () => {
    expect(
      sanitizeForLogging({
        authorization: 'Bearer secret',
        cookie: 'session=secret',
        password: 'secret',
        newPassword: 'secret',
        confirmPassword: 'secret',
        otp: '123456',
        token: 'abc',
        refreshToken: 'refresh',
        accessToken: 'access',
        secret: 'super-secret',
        apiKey: 'api-key',
        cardNumber: '4111111111111111',
        cvv: '123',
        paymentToken: 'pay-token',
        nested: {
          clientSecret: 'nested-secret',
        },
      }),
    ).toEqual({
      authorization: '[REDACTED]',
      cookie: '[REDACTED]',
      password: '[REDACTED]',
      newPassword: '[REDACTED]',
      confirmPassword: '[REDACTED]',
      otp: '[REDACTED]',
      token: '[REDACTED]',
      refreshToken: '[REDACTED]',
      accessToken: '[REDACTED]',
      secret: '[REDACTED]',
      apiKey: '[REDACTED]',
      cardNumber: '[REDACTED]',
      cvv: '[REDACTED]',
      paymentToken: '[REDACTED]',
      nested: {
        clientSecret: '[REDACTED]',
      },
    });
  });
});
