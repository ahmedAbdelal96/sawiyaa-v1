import { ConfigService } from '@nestjs/config';
import { SmtpEmailProvider } from './smtp-email.provider';
import { EmailProviderAdapter } from './email-provider.adapter';

type EmailTransporterMock = {
  sendMail: jest.Mock<
    Promise<unknown>,
    [{ from: string; to: string; subject: string; text: string }]
  >;
};

type TransportConfig = {
  host: string;
  port: number;
  secure: boolean;
  auth?: { user: string; pass: string };
};

const createTransportMock = jest.fn() as unknown as jest.MockedFunction<
  (config: TransportConfig) => EmailTransporterMock
>;

jest.mock('nodemailer', () => ({
  __esModule: true,
  createTransport: createTransportMock,
  default: { createTransport: createTransportMock },
}));

describe('SmtpEmailProvider', () => {
  const buildConfigService = (values: Record<string, unknown>): ConfigService =>
    ({ get: (key: string) => values[key] }) as unknown as ConfigService;

  const makeProvider = (
    config: Record<string, unknown>,
  ): EmailProviderAdapter => new SmtpEmailProvider(buildConfigService(config));

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('name', () => {
    it('returns "smtp"', () => {
      expect(makeProvider({}).name).toBe('smtp');
    });
  });

  describe('sendEmail — success', () => {
    it('sends the email via nodemailer and returns delivered=true', async () => {
      const sendMail = jest
        .fn<Promise<unknown>, [{ from: string; to: string; subject: string; text: string }]>()
        .mockResolvedValue({ messageId: 'msg-123' });
      createTransportMock.mockReturnValue({ sendMail });

      const provider = makeProvider({
        'notification.mail.from': 'no-reply@fayed.dev',
        'notification.mail.smtp.host': 'smtp.mailtrap.io',
        'notification.mail.smtp.port': 587,
        'notification.mail.smtp.secure': false,
      });

      const result = await provider.sendEmail({
        to: 'practitioner@fayed.local',
        subject: 'Your OTP',
        body: '123456',
      });

      expect(result).toEqual({
        delivered: true,
        deliveryTarget: 'practitioner@fayed.local',
      });
      expect(sendMail).toHaveBeenCalledWith({
        from: 'no-reply@fayed.dev',
        to: 'practitioner@fayed.local',
        subject: 'Your OTP',
        text: '123456',
      });
    });

    it('sends to exactly the `to` address it receives (no redirect)', async () => {
      // Provider should pass through the `to` address unchanged — redirect is
      // handled by NotificationEmailService before calling the provider.
      const sendMail = jest
        .fn<Promise<unknown>, [{ from: string; to: string; subject: string; text: string }]>()
        .mockResolvedValue({ messageId: 'msg-123' });
      createTransportMock.mockReturnValue({ sendMail });

      const provider = makeProvider({
        'app.nodeEnv': 'development',
        'notification.mail.from': 'no-reply@fayed.dev',
        'notification.mail.devOtpEmailRedirect': 'qa@example.com',
        'notification.mail.smtp.host': 'smtp.mailtrap.io',
        'notification.mail.smtp.port': 587,
        'notification.mail.smtp.secure': false,
      });

      const result = await provider.sendEmail({
        to: 'practitioner@fayed.local',
        subject: 'Your OTP',
        body: '123456',
        isOtp: true,
      });

      expect(result.delivered).toBe(true);
      // Provider sends to the address it was given — not redirected
      expect(sendMail).toHaveBeenCalledWith(
        expect.objectContaining({ to: 'practitioner@fayed.local' }),
      );
    });
  });

  describe('sendEmail — MAIL_FROM not configured', () => {
    it('returns delivered=false with MAIL_TRANSPORT_NOT_CONFIGURED', async () => {
      const provider = makeProvider({
        'notification.mail.from': '',
        'notification.mail.smtp.host': 'smtp.mailtrap.io',
        'notification.mail.smtp.port': 587,
        'notification.mail.smtp.secure': false,
      });

      const result = await provider.sendEmail({
        to: 'practitioner@fayed.local',
        subject: 'Subject',
        body: 'Body',
      });

      expect(result).toEqual({
        delivered: false,
        deliveryTarget: 'practitioner@fayed.local',
        error: 'MAIL_TRANSPORT_NOT_CONFIGURED',
      });
    });
  });

  describe('sendEmail — SMTP failure', () => {
    it('returns delivered=false with MAIL_SEND_FAILED', async () => {
      const sendMail = jest
        .fn<Promise<unknown>, [{ from: string; to: string; subject: string; text: string }]>()
        .mockRejectedValue(new Error('ESMTP connection closed'));
      createTransportMock.mockReturnValue({ sendMail });

      const provider = makeProvider({
        'notification.mail.from': 'no-reply@fayed.dev',
        'notification.mail.smtp.host': 'smtp.mailtrap.io',
        'notification.mail.smtp.port': 587,
        'notification.mail.smtp.secure': false,
      });

      const result = await provider.sendEmail({
        to: 'practitioner@fayed.local',
        subject: 'Subject',
        body: 'Body',
      });

      expect(result).toEqual({
        delivered: false,
        deliveryTarget: 'practitioner@fayed.local',
        error: 'MAIL_SEND_FAILED',
      });
    });
  });

  describe('sendEmail — OTP bypass is NOT handled here', () => {
    // Dev OTP bypass is handled by NotificationEmailService.
    // SmtpEmailProvider returns failure so the service can apply bypass.
    it('returns failure for SMTP errors regardless of isOtp flag', async () => {
      const sendMail = jest
        .fn<Promise<unknown>, [{ from: string; to: string; subject: string; text: string }]>()
        .mockRejectedValue(new Error('SMTP timeout'));
      createTransportMock.mockReturnValue({ sendMail });

      const provider = makeProvider({
        'app.nodeEnv': 'development',
        'notification.mail.from': 'no-reply@fayed.dev',
        'notification.mail.devOtpBypassDeliveryFailures': true,
        'notification.mail.smtp.host': 'smtp.mailtrap.io',
        'notification.mail.smtp.port': 587,
        'notification.mail.smtp.secure': false,
      });

      const result = await provider.sendEmail({
        to: 'practitioner@fayed.local',
        subject: 'Your OTP',
        body: '123456',
        isOtp: true,
      });

      // Provider does not apply bypass — it returns the failure to the service
      expect(result).toEqual({
        delivered: false,
        deliveryTarget: 'practitioner@fayed.local',
        error: 'MAIL_SEND_FAILED',
      });
    });
  });
});
