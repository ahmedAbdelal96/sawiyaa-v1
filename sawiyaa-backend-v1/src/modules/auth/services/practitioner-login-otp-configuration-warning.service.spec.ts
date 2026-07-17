import { PractitionerLoginOtpConfigurationWarningService } from './practitioner-login-otp-configuration-warning.service';

describe('PractitionerLoginOtpConfigurationWarningService', () => {
  it('logs one structured critical warning when OTP is disabled', () => {
    const config = {
      get: jest.fn((key: string) => {
        if (key === 'auth.practitionerLoginOtpRequired') return false;
        if (key === 'app.nodeEnv') return 'production';
        return undefined;
      }),
    };
    const logger = { error: jest.fn() };
    const service = new PractitionerLoginOtpConfigurationWarningService(
      config as any,
      logger as any,
    );

    service.onApplicationBootstrap();
    service.onApplicationBootstrap();

    expect(logger.error).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'PRACTITIONER_LOGIN_OTP_DISABLED',
        severity: 'critical',
        environment: 'production',
        otpRequired: false,
      }),
      undefined,
      'Authentication',
    );
  });

  it('does not warn when OTP is required', () => {
    const config = {
      get: jest.fn((key: string) =>
        key === 'auth.practitionerLoginOtpRequired' ? true : undefined,
      ),
    };
    const logger = { error: jest.fn() };
    const service = new PractitionerLoginOtpConfigurationWarningService(
      config as any,
      logger as any,
    );

    service.onApplicationBootstrap();

    expect(logger.error).not.toHaveBeenCalled();
  });
});
