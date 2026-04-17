import { ConfigService } from '@nestjs/config';
import { NotificationEmailService } from './notification-email.service';
import nodemailer from 'nodemailer';

jest.mock('nodemailer', () => ({
  __esModule: true,
  default: {
    createTransport: jest.fn(),
  },
}));

describe('NotificationEmailService', () => {
  const buildConfigService = (values: Record<string, unknown>): ConfigService =>
    ({
      get: (key: string) => values[key],
    }) as unknown as ConfigService;

  it('uses OTP redirect when target looks like an email in development', () => {
    const service = new NotificationEmailService(
      buildConfigService({
        'app.nodeEnv': 'development',
        'notification.mail.devOtpEmailRedirect': 'qa@example.com',
      }),
    );

    const resolution = service.resolveOtpTarget('practitioner@fayed.local');

    expect(resolution).toEqual({
      deliveryTarget: 'qa@example.com',
      redirectTarget: 'qa@example.com',
      wasRedirected: true,
    });
  });

  it('ignores OTP redirect when configured value is not an email target', () => {
    const service = new NotificationEmailService(
      buildConfigService({
        'app.nodeEnv': 'development',
        'notification.mail.devOtpEmailRedirect': '5',
      }),
    );

    const resolution = service.resolveOtpTarget('practitioner@fayed.local');

    expect(resolution).toEqual({
      deliveryTarget: 'practitioner@fayed.local',
      wasRedirected: false,
    });
  });

  it('fails fast with deterministic error for invalid email target', async () => {
    const service = new NotificationEmailService(
      buildConfigService({
        'notification.mail.provider': 'smtp',
      }),
    );

    const result = await service.sendEmail({
      to: '5',
      subject: 'Subject',
      body: 'Body',
      notificationId: 'n1',
      isOtp: true,
    });

    expect(result).toEqual({
      delivered: false,
      deliveryTarget: '5',
      error: 'EMAIL_TARGET_INVALID',
    });
  });

  it('bypasses OTP delivery failures in development when explicitly enabled', async () => {
    const sendMail = jest.fn().mockRejectedValue(new Error('SMTP timeout'));
    (nodemailer.createTransport as jest.Mock).mockReturnValue({ sendMail });

    const service = new NotificationEmailService(
      buildConfigService({
        'app.nodeEnv': 'development',
        'notification.mail.devOtpBypassDeliveryFailures': true,
        'notification.mail.provider': 'smtp',
        'notification.mail.from': 'no-reply@fayed.dev',
        'notification.mail.smtp.host': 'smtp.mailtrap.io',
        'notification.mail.smtp.port': 587,
        'notification.mail.smtp.secure': false,
      }),
    );

    const result = await service.sendEmail({
      to: 'practitioner@fayed.local',
      subject: 'Subject',
      body: 'Your practitioner login OTP is 123456',
      notificationId: 'n2',
      isOtp: true,
    });

    expect(result).toEqual({
      delivered: true,
      deliveryTarget: 'practitioner@fayed.local',
    });
  });
});
