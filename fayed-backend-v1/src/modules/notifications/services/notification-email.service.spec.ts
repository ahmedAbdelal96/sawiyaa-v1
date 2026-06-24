import { ConfigService } from '@nestjs/config';
import { NotificationEmailService } from './notification-email.service';
import { EmailProviderAdapter } from '../providers/email-provider.adapter';
import { EMAIL_PROVIDER } from '../providers/email-provider.token';

const buildConfigService = (values: Record<string, unknown>): ConfigService =>
  ({ get: (key: string) => values[key] }) as unknown as ConfigService;

const mockProvider = (result: {
  delivered: boolean;
  deliveryTarget: string;
  error?: string;
}): EmailProviderAdapter =>
  ({
    name: 'mock',
    sendEmail: jest.fn().mockResolvedValue(result),
  }) as unknown as EmailProviderAdapter;

describe('NotificationEmailService', () => {
  describe('resolveOtpTarget', () => {
    it('redirects OTP email to dev address when in development', () => {
      const service = new NotificationEmailService(
        buildConfigService({
          'app.nodeEnv': 'development',
          'notification.mail.devOtpEmailRedirect': 'qa@example.com',
        }),
        mockProvider({ delivered: true, deliveryTarget: 'qa@example.com' }),
      );

      const resolution = service.resolveOtpTarget('practitioner@fayed.local');

      expect(resolution).toEqual({
        deliveryTarget: 'qa@example.com',
        redirectTarget: 'qa@example.com',
        wasRedirected: true,
      });
    });

    it('ignores redirect when configured value is not an email target', () => {
      const service = new NotificationEmailService(
        buildConfigService({
          'app.nodeEnv': 'development',
          'notification.mail.devOtpEmailRedirect': '5',
        }),
        mockProvider({
          delivered: true,
          deliveryTarget: 'practitioner@fayed.local',
        }),
      );

      const resolution = service.resolveOtpTarget('practitioner@fayed.local');

      expect(resolution).toEqual({
        deliveryTarget: 'practitioner@fayed.local',
        wasRedirected: false,
      });
    });

    it('does not redirect in production', () => {
      const service = new NotificationEmailService(
        buildConfigService({
          'app.nodeEnv': 'production',
          'notification.mail.devOtpEmailRedirect': 'qa@example.com',
        }),
        mockProvider({
          delivered: true,
          deliveryTarget: 'practitioner@fayed.local',
        }),
      );

      const resolution = service.resolveOtpTarget('practitioner@fayed.local');

      expect(resolution).toEqual({
        deliveryTarget: 'practitioner@fayed.local',
        wasRedirected: false,
      });
    });
  });

  describe('sendEmail — input validation', () => {
    it('returns EMAIL_TARGET_INVALID for non-email target', async () => {
      const service = new NotificationEmailService(
        buildConfigService({}),
        mockProvider({ delivered: true, deliveryTarget: '5' }),
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

    it('returns EMAIL_TARGET_MISSING for empty target', async () => {
      const service = new NotificationEmailService(
        buildConfigService({}),
        mockProvider({ delivered: true, deliveryTarget: '' }),
      );

      const result = await service.sendEmail({
        to: '   ',
        subject: 'Subject',
        body: 'Body',
        notificationId: 'n1',
        isOtp: true,
      });

      expect(result).toEqual({
        delivered: false,
        deliveryTarget: '   ',
        error: 'EMAIL_TARGET_MISSING',
      });
    });
  });

  describe('sendEmail — delegation to provider', () => {
    it('returns delivered=true when provider succeeds', async () => {
      const provider = mockProvider({
        delivered: true,
        deliveryTarget: 'practitioner@fayed.local',
      });
      const service = new NotificationEmailService(
        buildConfigService({ 'app.nodeEnv': 'production' }),
        provider,
      );

      const result = await service.sendEmail({
        to: 'practitioner@fayed.local',
        subject: 'Subject',
        body: 'Body',
        notificationId: 'n2',
        isOtp: false,
      });

      expect(result).toEqual({
        delivered: true,
        deliveryTarget: 'practitioner@fayed.local',
      });
    });

    it('returns delivered=false with provider error when provider fails', async () => {
      const provider = mockProvider({
        delivered: false,
        deliveryTarget: 'practitioner@fayed.local',
        error: 'BREVO_SEND_FAILED',
      });
      const service = new NotificationEmailService(
        buildConfigService({ 'app.nodeEnv': 'production' }),
        provider,
      );

      const result = await service.sendEmail({
        to: 'practitioner@fayed.local',
        subject: 'Subject',
        body: 'Body',
        notificationId: 'n3',
        isOtp: false,
      });

      expect(result).toEqual({
        delivered: false,
        deliveryTarget: 'practitioner@fayed.local',
        error: 'BREVO_SEND_FAILED',
      });
    });

    it('passes redirected address to provider for OTP in development', async () => {
      // Track what the provider received
      let capturedTo = '';
      const provider = {
        name: 'mock',
        sendEmail: jest.fn().mockImplementation(({ to }: { to: string }) => {
          capturedTo = to;
          return Promise.resolve({ delivered: true, deliveryTarget: to });
        }),
      } as unknown as EmailProviderAdapter;

      const service = new NotificationEmailService(
        buildConfigService({
          'app.nodeEnv': 'development',
          'notification.mail.devOtpEmailRedirect': 'qa@example.com',
        }),
        provider,
      );

      const result = await service.sendEmail({
        to: 'practitioner@fayed.local',
        subject: 'Your OTP',
        body: '123456',
        notificationId: 'n6',
        isOtp: true,
      });

      // Provider must receive the redirected address, not the original
      expect(capturedTo).toBe('qa@example.com');
      expect(result).toEqual({
        delivered: true,
        deliveryTarget: 'qa@example.com',
      });
    });

    it('passes original address to provider for non-OTP even with redirect configured', async () => {
      let capturedTo = '';
      const provider = {
        name: 'mock',
        sendEmail: jest.fn().mockImplementation(({ to }: { to: string }) => {
          capturedTo = to;
          return Promise.resolve({ delivered: true, deliveryTarget: to });
        }),
      } as unknown as EmailProviderAdapter;

      const service = new NotificationEmailService(
        buildConfigService({
          'app.nodeEnv': 'development',
          'notification.mail.devOtpEmailRedirect': 'qa@example.com',
        }),
        provider,
      );

      const result = await service.sendEmail({
        to: 'practitioner@fayed.local',
        subject: 'Subject',
        body: 'Body',
        notificationId: 'n7',
        isOtp: false,
      });

      expect(capturedTo).toBe('practitioner@fayed.local');
      expect(result.delivered).toBe(true);
    });
  });

  describe('sendEmail — HTML pass-through to provider', () => {
    it('forwards the html field to the provider when supplied', async () => {
      let capturedHtml: string | undefined;
      const provider = {
        name: 'mock',
        sendEmail: jest.fn().mockImplementation(({ html }: { html?: string }) => {
          capturedHtml = html;
          return Promise.resolve({
            delivered: true,
            deliveryTarget: 'practitioner@fayed.local',
          });
        }),
      } as unknown as EmailProviderAdapter;

      const service = new NotificationEmailService(
        buildConfigService({ 'app.nodeEnv': 'production' }),
        provider,
      );

      await service.sendEmail({
        to: 'practitioner@fayed.local',
        subject: 'Subject',
        body: 'plain fallback',
        html: '<p>rich <b>html</b></p>',
        notificationId: 'n-html-1',
        isOtp: true,
      });

      // The HTML body must reach the provider unchanged so Brevo can
      // render it as `htmlContent`.
      expect(capturedHtml).toBe('<p>rich <b>html</b></p>');
    });

    it('does not pass an html field to the provider when the caller omits it', async () => {
      let capturedInput: Record<string, unknown> | undefined;
      const provider = {
        name: 'mock',
        sendEmail: jest.fn().mockImplementation((input: Record<string, unknown>) => {
          capturedInput = input;
          return Promise.resolve({
            delivered: true,
            deliveryTarget: 'practitioner@fayed.local',
          });
        }),
      } as unknown as EmailProviderAdapter;

      const service = new NotificationEmailService(
        buildConfigService({ 'app.nodeEnv': 'production' }),
        provider,
      );

      await service.sendEmail({
        to: 'practitioner@fayed.local',
        subject: 'Subject',
        body: 'plain fallback',
        notificationId: 'n-html-2',
        isOtp: false,
      });

      // Sanity: the html key must not be present (so the adapter
      // signature's `html?: string` is honored as truly optional).
      expect(capturedInput).not.toHaveProperty('html');
    });
  });

  describe('sendEmail — OTP dev bypass', () => {
    it('treats provider failure as success for OTP in development when bypass is enabled', async () => {
      const provider = mockProvider({
        delivered: false,
        deliveryTarget: 'practitioner@fayed.local',
        error: 'BREVO_SEND_FAILED',
      });
      const service = new NotificationEmailService(
        buildConfigService({
          'app.nodeEnv': 'development',
          'notification.mail.devOtpBypassDeliveryFailures': true,
        }),
        provider,
      );

      const result = await service.sendEmail({
        to: 'practitioner@fayed.local',
        subject: 'Your OTP',
        body: '123456',
        notificationId: 'n4',
        isOtp: true,
      });

      // Dev bypass converts failure → success for OTP
      expect(result).toEqual({
        delivered: true,
        deliveryTarget: 'practitioner@fayed.local',
      });
    });

    it('does not bypass for non-OTP emails even with bypass enabled', async () => {
      const provider = mockProvider({
        delivered: false,
        deliveryTarget: 'practitioner@fayed.local',
        error: 'BREVO_SEND_FAILED',
      });
      const service = new NotificationEmailService(
        buildConfigService({
          'app.nodeEnv': 'development',
          'notification.mail.devOtpBypassDeliveryFailures': true,
        }),
        provider,
      );

      const result = await service.sendEmail({
        to: 'practitioner@fayed.local',
        subject: 'Subject',
        body: 'Body',
        notificationId: 'n5',
        isOtp: false,
      });

      expect(result).toEqual({
        delivered: false,
        deliveryTarget: 'practitioner@fayed.local',
        error: 'BREVO_SEND_FAILED',
      });
    });
  });

  describe('maskTarget', () => {
    it('masks email addresses preserving first 2 and last 1 chars of local part', () => {
      const service = new NotificationEmailService(
        buildConfigService({}),
        mockProvider({ delivered: true, deliveryTarget: 'test@example.com' }),
      );

      expect(service.maskTarget('ahmed@fayed.com')).toBe('ah***d@fayed.com');
      expect(service.maskTarget('jo@fayed.com')).toBe('j*@fayed.com');
      expect(service.maskTarget('x@y.com')).toBe('x*@y.com');
      expect(service.maskTarget('ab@y.com')).toBe('a*@y.com');
    });

    it('masks non-email strings', () => {
      const service = new NotificationEmailService(
        buildConfigService({}),
        mockProvider({ delivered: true, deliveryTarget: 'abcdef' }),
      );

      expect(service.maskTarget('abcdef')).toBe('ab***ef');
      expect(service.maskTarget('ab')).toBe('a***');
      expect(service.maskTarget('')).toBe('***');
    });
  });
});
