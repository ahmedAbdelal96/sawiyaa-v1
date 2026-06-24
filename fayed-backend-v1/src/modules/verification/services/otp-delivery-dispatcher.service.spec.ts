import { ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationChannel, OtpChannel, OtpPurpose } from '@prisma/client';
import { OtpDeliveryDispatcherService } from './otp-delivery-dispatcher.service';
import { VerificationNotificationRepository } from '../repositories/notification.repository';
import { NotificationEmailService } from '@modules/notifications/services/notification-email.service';
import { I18nService } from '@common/i18n/services/i18n.service';

const buildConfigService = (values: Record<string, unknown>): ConfigService =>
  ({ get: (key: string) => values[key] }) as unknown as ConfigService;

const buildI18nService = (): I18nService =>
  ({
    t: jest.fn((key: string, _locale?: string, params?: Record<string, string | number>) => {
      // Minimal stub that returns predictable catalog values so the
      // PASSWORD_RESET path remains locale-aware in the dispatcher test.
      const dict: Record<string, string> = {
        'auth.notifications.passwordResetTitle': 'Password reset code',
        'auth.notifications.passwordResetBody':
          'Your password reset code is {{code}}',
      };
      const template = dict[key] ?? key;
      if (!params) return template;
      return Object.entries(params).reduce(
        (acc, [k, v]) => acc.replace(new RegExp(`{{\\s*${k}\\s*}}`, 'g'), String(v)),
        template,
      );
    }),
  }) as unknown as I18nService;

describe('OtpDeliveryDispatcherService', () => {
  let notificationRepository: VerificationNotificationRepository;
  let notificationEmailService: NotificationEmailService;
  let dispatcher: OtpDeliveryDispatcherService;

  const buildNotificationType = (slug: string) => ({
    id: `type-${slug}`,
    slug,
    category: 'auth',
    templates: [
      {
        id: `tpl-${slug}-email`,
        channel: NotificationChannel.EMAIL,
        version: 1,
        isActive: true,
      },
    ],
  });

  beforeEach(() => {
    jest.clearAllMocks();
    notificationRepository = {
      findTypeBySlug: jest.fn().mockResolvedValue(
        buildNotificationType('auth.practitioner-login-otp'),
      ),
      createNotification: jest.fn().mockResolvedValue({
        id: 'notif-1',
      }),
      updateStatus: jest.fn().mockResolvedValue({}),
    } as unknown as VerificationNotificationRepository;

    notificationEmailService = {
      resolveOtpTarget: jest
        .fn()
        .mockReturnValue({ deliveryTarget: 'practitioner@fayed.local' }),
      sendEmail: jest.fn().mockResolvedValue({
        delivered: true,
        deliveryTarget: 'practitioner@fayed.local',
      }),
    } as unknown as NotificationEmailService;

    dispatcher = new OtpDeliveryDispatcherService(
      buildI18nService(),
      notificationRepository,
      notificationEmailService,
      buildConfigService({ 'auth.otp.loginTtlMinutes': 10 }),
    );
  });

  describe('practitioner login OTP — English-only content', () => {
    it('uses the fixed English subject regardless of locale', async () => {
      await dispatcher.dispatch({
        userId: 'user-1',
        channel: OtpChannel.EMAIL,
        target: 'practitioner@fayed.local',
        code: '482910',
        expiresAt: new Date(),
        locale: 'ar',
        purposeLabel: OtpPurpose.PRACTITIONER_LOGIN,
      });

      const call = (notificationEmailService.sendEmail as jest.Mock).mock.calls[0][0];
      expect(call.subject).toBe('Your Sawiyaa login code');
    });

    it('includes "Hello Doctor" and the Sawiyaa brand in the plain-text body', async () => {
      await dispatcher.dispatch({
        userId: 'user-1',
        channel: OtpChannel.EMAIL,
        target: 'practitioner@fayed.local',
        code: '482910',
        expiresAt: new Date(),
        locale: 'en',
        purposeLabel: OtpPurpose.PRACTITIONER_LOGIN,
      });

      const call = (notificationEmailService.sendEmail as jest.Mock).mock.calls[0][0];
      expect(call.body).toContain('Hello Doctor');
      expect(call.body).toContain('Sawiyaa');
      expect(call.body).toContain('482910');
    });

    it('includes the TTL in minutes in the plain-text body', async () => {
      dispatcher = new OtpDeliveryDispatcherService(
        buildI18nService(),
        notificationRepository,
        notificationEmailService,
        buildConfigService({ 'auth.otp.loginTtlMinutes': 7 }),
      );

      await dispatcher.dispatch({
        userId: 'user-1',
        channel: OtpChannel.EMAIL,
        target: 'practitioner@fayed.local',
        code: '482910',
        expiresAt: new Date(),
        locale: 'en',
        purposeLabel: OtpPurpose.PRACTITIONER_LOGIN,
      });

      const call = (notificationEmailService.sendEmail as jest.Mock).mock.calls[0][0];
      expect(call.body).toContain('This code is valid for 7 minutes.');
    });

    it('falls back to 10 minutes when the config value is missing', async () => {
      dispatcher = new OtpDeliveryDispatcherService(
        buildI18nService(),
        notificationRepository,
        notificationEmailService,
        buildConfigService({}),
      );

      await dispatcher.dispatch({
        userId: 'user-1',
        channel: OtpChannel.EMAIL,
        target: 'practitioner@fayed.local',
        code: '482910',
        expiresAt: new Date(),
        locale: 'en',
        purposeLabel: OtpPurpose.PRACTITIONER_LOGIN,
      });

      const call = (notificationEmailService.sendEmail as jest.Mock).mock.calls[0][0];
      expect(call.body).toContain('This code is valid for 10 minutes.');
    });

    it('always renders the practitioner login email in English, even for ar locale', async () => {
      const i18n = buildI18nService();
      const tSpy = jest.spyOn(i18n, 't');

      dispatcher = new OtpDeliveryDispatcherService(
        i18n,
        notificationRepository,
        notificationEmailService,
        buildConfigService({ 'auth.otp.loginTtlMinutes': 10 }),
      );

      await dispatcher.dispatch({
        userId: 'user-1',
        channel: OtpChannel.EMAIL,
        target: 'practitioner@fayed.local',
        code: '482910',
        expiresAt: new Date(),
        locale: 'ar',
        purposeLabel: OtpPurpose.PRACTITIONER_LOGIN,
      });

      // The English template is rendered directly, the i18n catalog
      // is NOT consulted for practitioner login OTP.
      expect(tSpy).not.toHaveBeenCalledWith(
        'auth.notifications.practitionerLoginOtpTitle',
        expect.anything(),
      );
      expect(tSpy).not.toHaveBeenCalledWith(
        'auth.notifications.practitionerLoginOtpBody',
        expect.anything(),
      );
    });
  });

  describe('practitioner login OTP — HTML body', () => {
    it('threads an HTML body to the email service', async () => {
      await dispatcher.dispatch({
        userId: 'user-1',
        channel: OtpChannel.EMAIL,
        target: 'practitioner@fayed.local',
        code: '482910',
        expiresAt: new Date(),
        locale: 'en',
        purposeLabel: OtpPurpose.PRACTITIONER_LOGIN,
      });

      const call = (notificationEmailService.sendEmail as jest.Mock).mock.calls[0][0];
      expect(typeof call.html).toBe('string');
      expect(call.html.length).toBeGreaterThan(0);
    });

    it('HTML contains the bilingual brand header', async () => {
      await dispatcher.dispatch({
        userId: 'user-1',
        channel: OtpChannel.EMAIL,
        target: 'practitioner@fayed.local',
        code: '482910',
        expiresAt: new Date(),
        locale: 'en',
        purposeLabel: OtpPurpose.PRACTITIONER_LOGIN,
      });

      const call = (notificationEmailService.sendEmail as jest.Mock).mock.calls[0][0];
      expect(call.html).toContain('Sawiyaa | سويّة');
    });

    it('HTML contains the OTP code', async () => {
      await dispatcher.dispatch({
        userId: 'user-1',
        channel: OtpChannel.EMAIL,
        target: 'practitioner@fayed.local',
        code: '482910',
        expiresAt: new Date(),
        locale: 'en',
        purposeLabel: OtpPurpose.PRACTITIONER_LOGIN,
      });

      const call = (notificationEmailService.sendEmail as jest.Mock).mock.calls[0][0];
      expect(call.html).toContain('482910');
    });

    it('HTML highlights the OTP code in a styled block', async () => {
      await dispatcher.dispatch({
        userId: 'user-1',
        channel: OtpChannel.EMAIL,
        target: 'practitioner@fayed.local',
        code: '482910',
        expiresAt: new Date(),
        locale: 'en',
        purposeLabel: OtpPurpose.PRACTITIONER_LOGIN,
      });

      const call = (notificationEmailService.sendEmail as jest.Mock).mock.calls[0][0];
      // Highlight checks: large font, bold weight, monospace family, soft green background.
      expect(call.html).toMatch(/font-size:\s*38px/);
      expect(call.html).toMatch(/font-weight:\s*800/);
      expect(call.html).toMatch(/letter-spacing:\s*6px/);
      expect(call.html).toMatch(/background-color:\s*#ECFDF5/i);
      expect(call.html).toMatch(/text-align:\s*center/);
    });

    it('OTP code block has dir="ltr" so RTL clients render the digits correctly', async () => {
      await dispatcher.dispatch({
        userId: 'user-1',
        channel: OtpChannel.EMAIL,
        target: 'practitioner@fayed.local',
        code: '482910',
        expiresAt: new Date(),
        locale: 'en',
        purposeLabel: OtpPurpose.PRACTITIONER_LOGIN,
      });

      const call = (notificationEmailService.sendEmail as jest.Mock).mock.calls[0][0];
      // The OTP-bearing <div> must be LTR.
      expect(call.html).toMatch(/<div[^>]*dir="ltr"[\s\S]*>482910/);
      // The <html> tag itself must be LTR.
      expect(call.html).toMatch(/<html[^>]*dir="ltr"/);
    });

    it('HTML is English LTR (no Arabic in the layout body)', async () => {
      await dispatcher.dispatch({
        userId: 'user-1',
        channel: OtpChannel.EMAIL,
        target: 'practitioner@fayed.local',
        code: '482910',
        expiresAt: new Date(),
        locale: 'en',
        purposeLabel: OtpPurpose.PRACTITIONER_LOGIN,
      });

      const call = (notificationEmailService.sendEmail as jest.Mock).mock.calls[0][0];
      // The body of the email should not contain large Arabic prose
      // (the brand line is the only allowed Arabic content).
      const arabicBlock = /[؀-ۿ]{4,}/g;
      const matches = call.html.match(arabicBlock) ?? [];
      // Only the bilingual brand "سويّة" should be present.
      matches.forEach((m) => {
        expect(m.trim()).toBe('سويّة');
      });
    });
  });

  describe('security: no OTP code in logs', () => {
    it('does not log the body or html content (which carry the code)', async () => {
      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
      const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

      await dispatcher.dispatch({
        userId: 'user-1',
        channel: OtpChannel.EMAIL,
        target: 'practitioner@fayed.local',
        code: '482910',
        expiresAt: new Date(),
        locale: 'en',
        purposeLabel: OtpPurpose.PRACTITIONER_LOGIN,
      });

      const allCalls = [
        ...logSpy.mock.calls,
        ...warnSpy.mock.calls,
        ...errorSpy.mock.calls,
      ];
      for (const callArgs of allCalls) {
        for (const arg of callArgs) {
          expect(String(arg)).not.toContain('482910');
        }
      }

      logSpy.mockRestore();
      warnSpy.mockRestore();
      errorSpy.mockRestore();
    });
  });

  describe('Brevo receives htmlContent when html is supplied', () => {
    it('passes the html field through to NotificationEmailService → provider', async () => {
      // Capture provider input via NotificationEmailService mock.
      const sendEmailMock = notificationEmailService.sendEmail as unknown as jest.Mock;
      sendEmailMock.mockImplementation((input: { html?: string }) => {
        // Echo html through the "provider" boundary by storing it in the
        // result. This is the closest we can get to asserting Brevo
        // receives it without a live provider in the test.
        return Promise.resolve({
          delivered: true,
          deliveryTarget: input.html ? 'with-html' : 'no-html',
          htmlCaptured: input.html,
        });
      });

      await dispatcher.dispatch({
        userId: 'user-1',
        channel: OtpChannel.EMAIL,
        target: 'practitioner@fayed.local',
        code: '482910',
        expiresAt: new Date(),
        locale: 'en',
        purposeLabel: OtpPurpose.PRACTITIONER_LOGIN,
      });

      const call = sendEmailMock.mock.calls[0][0];
      expect(typeof call.html).toBe('string');
      expect(call.html).toContain('482910');
    });
  });

  describe('PASSWORD_RESET — rich HTML email template', () => {
    it('uses the branded subject for PASSWORD_RESET', async () => {
      (notificationRepository.findTypeBySlug as jest.Mock).mockResolvedValue(
        buildNotificationType('auth.password-reset'),
      );

      await dispatcher.dispatch({
        userId: 'user-1',
        channel: OtpChannel.EMAIL,
        target: 'patient@fayed.local',
        code: '654321',
        expiresAt: new Date(),
        locale: 'en',
        purposeLabel: OtpPurpose.PASSWORD_RESET,
        isPractitioner: false,
      });

      const call = (notificationEmailService.sendEmail as jest.Mock).mock.calls[0][0];
      expect(call.subject).toBe('Your Sawiyaa password reset code');
    });

    it('renders Arabic content when locale is ar and isPractitioner is false', async () => {
      (notificationRepository.findTypeBySlug as jest.Mock).mockResolvedValue(
        buildNotificationType('auth.password-reset'),
      );

      await dispatcher.dispatch({
        userId: 'user-1',
        channel: OtpChannel.EMAIL,
        target: 'patient@fayed.local',
        code: '654321',
        expiresAt: new Date(),
        locale: 'ar',
        purposeLabel: OtpPurpose.PASSWORD_RESET,
        isPractitioner: false,
      });

      const call = (notificationEmailService.sendEmail as jest.Mock).mock.calls[0][0];
      expect(call.subject).toBe('رمز إعادة تعيين كلمة المرور في سويّة');
      expect(call.body).toContain('مرحبًا');
    });

    it('always uses English subject when isPractitioner is true', async () => {
      (notificationRepository.findTypeBySlug as jest.Mock).mockResolvedValue(
        buildNotificationType('auth.password-reset'),
      );

      await dispatcher.dispatch({
        userId: 'user-1',
        channel: OtpChannel.EMAIL,
        target: 'practitioner@fayed.local',
        code: '654321',
        expiresAt: new Date(),
        locale: 'ar',
        purposeLabel: OtpPurpose.PASSWORD_RESET,
        isPractitioner: true,
      });

      const call = (notificationEmailService.sendEmail as jest.Mock).mock.calls[0][0];
      expect(call.subject).toBe('Your Sawiyaa password reset code');
      expect(call.body).toContain('Hello');
    });

    it('threads HTML to the email service for PASSWORD_RESET', async () => {
      (notificationRepository.findTypeBySlug as jest.Mock).mockResolvedValue(
        buildNotificationType('auth.password-reset'),
      );

      await dispatcher.dispatch({
        userId: 'user-1',
        channel: OtpChannel.EMAIL,
        target: 'patient@fayed.local',
        code: '654321',
        expiresAt: new Date(),
        locale: 'en',
        purposeLabel: OtpPurpose.PASSWORD_RESET,
        isPractitioner: false,
      });

      const call = (notificationEmailService.sendEmail as jest.Mock).mock.calls[0][0];
      expect(typeof call.html).toBe('string');
      expect(call.html.length).toBeGreaterThan(0);
    });

    it('PASSWORD_RESET HTML contains the OTP code', async () => {
      (notificationRepository.findTypeBySlug as jest.Mock).mockResolvedValue(
        buildNotificationType('auth.password-reset'),
      );

      await dispatcher.dispatch({
        userId: 'user-1',
        channel: OtpChannel.EMAIL,
        target: 'patient@fayed.local',
        code: '999888',
        expiresAt: new Date(),
        locale: 'en',
        purposeLabel: OtpPurpose.PASSWORD_RESET,
        isPractitioner: false,
      });

      const call = (notificationEmailService.sendEmail as jest.Mock).mock.calls[0][0];
      expect(call.html).toContain('999888');
    });

    it('PASSWORD_RESET HTML highlights the OTP code with correct styling', async () => {
      (notificationRepository.findTypeBySlug as jest.Mock).mockResolvedValue(
        buildNotificationType('auth.password-reset'),
      );

      await dispatcher.dispatch({
        userId: 'user-1',
        channel: OtpChannel.EMAIL,
        target: 'patient@fayed.local',
        code: '123456',
        expiresAt: new Date(),
        locale: 'en',
        purposeLabel: OtpPurpose.PASSWORD_RESET,
        isPractitioner: false,
      });

      const call = (notificationEmailService.sendEmail as jest.Mock).mock.calls[0][0];
      expect(call.html).toMatch(/font-size:\s*38px/);
      expect(call.html).toMatch(/font-weight:\s*800/);
      expect(call.html).toMatch(/letter-spacing:\s*6px/);
      expect(call.html).toMatch(/background-color:\s*#ECFDF5/i);
      expect(call.html).toMatch(/dir="ltr"/);
    });

    it('PASSWORD_RESET body does not contain OTP when printed in logs (security)', async () => {
      (notificationRepository.findTypeBySlug as jest.Mock).mockResolvedValue(
        buildNotificationType('auth.password-reset'),
      );
      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
      const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

      await dispatcher.dispatch({
        userId: 'user-1',
        channel: OtpChannel.EMAIL,
        target: 'patient@fayed.local',
        code: '777777',
        expiresAt: new Date(),
        locale: 'en',
        purposeLabel: OtpPurpose.PASSWORD_RESET,
        isPractitioner: false,
      });

      const allCalls = [...logSpy.mock.calls, ...warnSpy.mock.calls, ...errorSpy.mock.calls];
      for (const callArgs of allCalls) {
        for (const arg of callArgs) {
          expect(String(arg)).not.toContain('777777');
        }
      }

      logSpy.mockRestore();
      warnSpy.mockRestore();
      errorSpy.mockRestore();
    });

    it('Brevo receives htmlContent for PASSWORD_RESET', async () => {
      (notificationRepository.findTypeBySlug as jest.Mock).mockResolvedValue(
        buildNotificationType('auth.password-reset'),
      );
      let capturedHtml: string | undefined;
      (notificationEmailService.sendEmail as jest.Mock).mockImplementation(
        (input: { html?: string }) => {
          capturedHtml = input.html;
          return Promise.resolve({
            delivered: true,
            deliveryTarget: 'patient@fayed.local',
          });
        },
      );

      await dispatcher.dispatch({
        userId: 'user-1',
        channel: OtpChannel.EMAIL,
        target: 'patient@fayed.local',
        code: '123456',
        expiresAt: new Date(),
        locale: 'en',
        purposeLabel: OtpPurpose.PASSWORD_RESET,
        isPractitioner: false,
      });

      expect(typeof capturedHtml).toBe('string');
      expect(capturedHtml!.length).toBeGreaterThan(0);
    });
  });

  describe('delivery failure', () => {
    it('returns delivered=false and marks notification FAILED', async () => {
      (notificationEmailService.sendEmail as jest.Mock).mockResolvedValue({
        delivered: false,
        deliveryTarget: 'practitioner@fayed.local',
        error: 'BREVO_SEND_FAILED',
      });

      // The dispatcher surfaces failure as a result; the
      // SendOtpChallengeUseCase is the layer that converts this into a
      // ServiceUnavailableException. Assert the dispatcher boundary here.
      const result = await dispatcher.dispatch({
        userId: 'user-1',
        channel: OtpChannel.EMAIL,
        target: 'practitioner@fayed.local',
        code: '482910',
        expiresAt: new Date(),
        locale: 'en',
        purposeLabel: OtpPurpose.PRACTITIONER_LOGIN,
      });

      expect(result).toEqual(
        expect.objectContaining({ delivered: false, channel: OtpChannel.EMAIL }),
      );

      expect(notificationRepository.updateStatus).toHaveBeenCalledWith(
        'notif-1',
        expect.objectContaining({ status: 'FAILED' }),
      );
    });

    it('throws when the notification type is missing', async () => {
      (notificationRepository.findTypeBySlug as jest.Mock).mockResolvedValue(null);

      await expect(
        dispatcher.dispatch({
          userId: 'user-1',
          channel: OtpChannel.EMAIL,
          target: 'practitioner@fayed.local',
          code: '482910',
          expiresAt: new Date(),
          locale: 'en',
          purposeLabel: OtpPurpose.PRACTITIONER_LOGIN,
        }),
      ).rejects.toBeInstanceOf(ServiceUnavailableException);
    });
  });
});
