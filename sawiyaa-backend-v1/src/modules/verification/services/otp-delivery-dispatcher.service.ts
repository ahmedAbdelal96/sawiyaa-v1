import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationChannel, OtpChannel, OtpPurpose } from '@prisma/client';
import { I18nService } from '@common/i18n/services/i18n.service';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { VerificationNotificationRepository } from '../repositories/notification.repository';
import { NotificationEmailService } from '@modules/notifications/services/notification-email.service';
import { OtpDeliveryResult } from '../types/otp.types';
import { renderPractitionerLoginOtpEmail } from './practitioner-login-otp-email.template';
import { renderPasswordResetOtpEmail } from './password-reset-otp-email.template';
import { renderPractitionerSignupEmailOtp } from './practitioner-signup-email-otp.template';
import { PractitionerOtpQaCaptureService } from './practitioner-otp-qa-capture.service';

/**
 * OTP delivery dispatcher bridges OTP challenges to notification delivery.
 * The OTP core never sends directly; this dispatcher handles channels and dev overrides.
 */
@Injectable()
export class OtpDeliveryDispatcherService {
  private readonly logger = new Logger(OtpDeliveryDispatcherService.name);

  constructor(
    private readonly i18nService: I18nService,
    private readonly notificationRepository: VerificationNotificationRepository,
    private readonly notificationEmailService: NotificationEmailService,
    private readonly configService: ConfigService,
    private readonly practitionerOtpQaCaptureService: PractitionerOtpQaCaptureService,
  ) {}

  async dispatch(input: {
    userId?: string | null;
    channel: OtpChannel;
    target: string;
    code: string;
    expiresAt: Date;
    locale: SupportedLocale;
    purposeLabel: OtpPurpose;
    isPractitioner?: boolean;
  }): Promise<OtpDeliveryResult> {
    if (input.channel === OtpChannel.EMAIL) {
      if (
        this.practitionerOtpQaCaptureService.shouldCapture?.(
          input.target,
          input.purposeLabel,
        ) === true
      ) {
        await this.practitionerOtpQaCaptureService.capture({
          target: input.target,
          code: input.code,
          expiresAt: input.expiresAt,
          purpose: input.purposeLabel,
        });
        return {
          delivered: true,
          deliveryTarget: input.target,
          channel: input.channel,
        };
      }
      return this.sendEmailOtp(input);
    }

    this.logger.warn(
      `OTP delivery channel "${input.channel}" is not configured yet`,
    );
    return {
      delivered: false,
      deliveryTarget: input.target,
      channel: input.channel,
    };
  }

  private resolveNotificationTypeSlug(purposeLabel: OtpPurpose): string {
    if (purposeLabel === OtpPurpose.PASSWORD_RESET) {
      return 'auth.password-reset';
    }

    if (purposeLabel === OtpPurpose.PRACTITIONER_LOGIN) {
      return 'auth.practitioner-login-otp';
    }
    if (purposeLabel === OtpPurpose.PRACTITIONER_SIGNUP_EMAIL_VERIFICATION) {
      // Keep delivery infrastructure compatible with existing notification seeds;
      // the OTP purpose remains isolated in the challenge record.
      return 'auth.practitioner-login-otp';
    }
    return 'auth.practitioner-login-otp';
  }

  /**
   * Resolve the practitioner login OTP TTL in whole minutes.
   *
   * Source of truth: `auth.otp.loginTtlMinutes` env config. We do not derive
   * TTL from `expiresAt - now` because that drifts slightly with delivery
   * latency, and the config value is what the practitioner sees in-app.
   */
  private resolvePractitionerLoginOtpTtlMinutes(): number {
    const fromConfig = this.configService.get<number>(
      'auth.otp.loginTtlMinutes',
    );
    if (
      typeof fromConfig === 'number' &&
      Number.isFinite(fromConfig) &&
      fromConfig > 0
    ) {
      return Math.floor(fromConfig);
    }
    // Safe default matches the env default (10 minutes).
    return 10;
  }

  /**
   * Practitioner login OTP is sent in English only, regardless of the
   * request locale. The dispatcher renders the email directly via
   * the dedicated template instead of going through the i18n catalog.
   */
  private resolvePractitionerLoginOtpContent(code: string) {
    const ttlMinutes = this.resolvePractitionerLoginOtpTtlMinutes();
    return renderPractitionerLoginOtpEmail({ code, ttlMinutes });
  }

  /**
   * Resolve the password reset OTP TTL in whole minutes.
   *
   * Source of truth: `auth.otp.resetPasswordTtlMinutes` env config.
   */
  private resolvePasswordResetOtpTtlMinutes(): number {
    const fromConfig = this.configService.get<number>(
      'auth.otp.resetPasswordTtlMinutes',
    );
    if (
      typeof fromConfig === 'number' &&
      Number.isFinite(fromConfig) &&
      fromConfig > 0
    ) {
      return Math.floor(fromConfig);
    }
    // Safe default matches the policy default (15 minutes).
    return 15;
  }

  /**
   * Password reset OTP is rendered via the dedicated email template
   * (rich HTML, Sawiyaa branding) instead of the i18n catalog.
   * - Practitioners: always English.
   * - Patients: locale-driven (ar/en).
   */
  private resolvePasswordResetOtpContent(
    code: string,
    locale: SupportedLocale,
    isPractitioner: boolean,
  ) {
    const ttlMinutes = this.resolvePasswordResetOtpTtlMinutes();
    return renderPasswordResetOtpEmail({
      code,
      ttlMinutes,
      locale,
      isPractitioner: Boolean(isPractitioner),
    });
  }

  private resolveSubjectAndBody(
    purposeLabel: OtpPurpose,
    locale: SupportedLocale,
    code: string,
    isPractitioner = false,
  ) {
    if (purposeLabel === OtpPurpose.PASSWORD_RESET) {
      // Rich HTML email rendered via dedicated template; locale-driven for
      // patients, English-only for practitioners.
      const { subject, body, html } = this.resolvePasswordResetOtpContent(
        code,
        locale,
        isPractitioner,
      );
      return { subject, body, html };
    }

    if (purposeLabel === OtpPurpose.PRACTITIONER_SIGNUP_EMAIL_VERIFICATION) {
      return renderPractitionerSignupEmailOtp({
        code,
        ttlMinutes: this.resolvePractitionerLoginOtpTtlMinutes(),
      });
    }

    // PRACTITIONER_LOGIN — English-only override (product decision).
    // Locale is intentionally ignored here. The rich HTML body is
    // computed by the dispatcher; we only forward it to the email
    // service, which threads it through to the provider.
    const { subject, body, html } =
      this.resolvePractitionerLoginOtpContent(code);
    return { subject, body, html };
  }

  private async sendEmailOtp(input: {
    userId?: string | null;
    channel: OtpChannel;
    target: string;
    code: string;
    expiresAt: Date;
    locale: SupportedLocale;
    purposeLabel: OtpPurpose;
    isPractitioner?: boolean;
  }): Promise<OtpDeliveryResult> {
    const notificationType = await this.notificationRepository.findTypeBySlug(
      this.resolveNotificationTypeSlug(input.purposeLabel),
    );

    if (!notificationType) {
      throw new ServiceUnavailableException({
        messageKey: 'auth.errors.notificationTypeMissing',
        error: 'NOTIFICATION_TYPE_MISSING',
      });
    }

    const { subject, body, html } = this.resolveSubjectAndBody(
      input.purposeLabel,
      input.locale,
      input.code,
      input.isPractitioner,
    );

    const redirectResolution = this.notificationEmailService.resolveOtpTarget(
      input.target,
    );

    // Pre-account verification has no user row yet. Deliver directly and never
    // create a notification row that would require a non-existent userId.
    if (!input.userId) {
      const delivery = await this.notificationEmailService.sendEmail({
        to: redirectResolution.deliveryTarget,
        subject,
        body,
        ...(html ? { html } : {}),
        isOtp: true,
      });
      return {
        delivered: delivery.delivered,
        deliveryTarget: delivery.deliveryTarget,
        channel: input.channel,
        redirectTarget: redirectResolution.redirectTarget,
      };
    }

    const notification = await this.notificationRepository.createNotification({
      userId: input.userId,
      notificationTypeId: notificationType.id,
      templateId:
        notificationType.templates.find(
          (template) => template.channel === NotificationChannel.EMAIL,
        )?.id ?? null,
      channel: NotificationChannel.EMAIL,
      status: 'PENDING',
      payloadJson: {
        target: input.target,
        deliveryTarget: redirectResolution.deliveryTarget,
        purpose: input.purposeLabel,
        expiresAt: input.expiresAt.toISOString(),
      },
      titleSnapshot: subject,
      // SECURITY: never store bodySnapshot — it contains the plain OTP code.
      // subjectSnapshot is safe to store since it does not contain the code.
      bodySnapshot: '[OTP email content redacted]',
      relatedEntityType: 'OTP_CHALLENGE',
    });

    // SECURITY: never log `body` or `html` — they contain the OTP code.
    const delivery = await this.notificationEmailService.sendEmail({
      to: redirectResolution.deliveryTarget,
      subject,
      body,
      ...(html ? { html } : {}),
      notificationId: notification.id,
      isOtp: true,
    });

    if (!delivery.delivered) {
      await this.notificationRepository.updateStatus(notification.id, {
        status: 'FAILED',
        failedAt: new Date(),
        suppressedReason: delivery.error ?? null,
      });
      return {
        delivered: false,
        deliveryTarget: delivery.deliveryTarget,
        channel: input.channel,
        redirectTarget: redirectResolution.redirectTarget,
      };
    }

    if (input.purposeLabel === OtpPurpose.PRACTITIONER_LOGIN) {
      await this.practitionerOtpQaCaptureService.capture({
        target: input.target,
        code: input.code,
        expiresAt: input.expiresAt,
        purpose: input.purposeLabel,
      });
    }

    await this.notificationRepository.updateStatus(notification.id, {
      status: 'SENT',
      sentAt: new Date(),
    });

    return {
      delivered: true,
      deliveryTarget: delivery.deliveryTarget,
      channel: input.channel,
      redirectTarget: redirectResolution.redirectTarget,
    };
  }
}
