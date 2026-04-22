import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { NotificationChannel, OtpChannel, OtpPurpose } from '@prisma/client';
import { I18nService } from '@common/i18n/services/i18n.service';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { VerificationNotificationRepository } from '../repositories/notification.repository';
import { NotificationEmailService } from '@modules/notifications/services/notification-email.service';
import { OtpDeliveryResult } from '../types/otp.types';

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
  ) {}

  async dispatch(input: {
    userId: string;
    channel: OtpChannel;
    target: string;
    code: string;
    expiresAt: Date;
    locale: SupportedLocale;
    purposeLabel: OtpPurpose;
  }): Promise<OtpDeliveryResult> {
    if (input.channel === OtpChannel.EMAIL) {
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
    return 'auth.practitioner-login-otp';
  }

  private resolveSubjectAndBody(
    purposeLabel: OtpPurpose,
    locale: SupportedLocale,
    code: string,
  ) {
    if (purposeLabel === OtpPurpose.PASSWORD_RESET) {
      return {
        subject: this.i18nService.t(
          'auth.notifications.passwordResetTitle',
          locale,
        ),
        body: this.i18nService.t(
          'auth.notifications.passwordResetBody',
          locale,
          { code },
        ),
      };
    }

    return {
      subject: this.i18nService.t(
        'auth.notifications.practitionerLoginOtpTitle',
        locale,
      ),
      body: this.i18nService.t(
        'auth.notifications.practitionerLoginOtpBody',
        locale,
        { code },
      ),
    };
  }

  private async sendEmailOtp(input: {
    userId: string;
    channel: OtpChannel;
    target: string;
    code: string;
    expiresAt: Date;
    locale: SupportedLocale;
    purposeLabel: OtpPurpose;
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

    const { subject, body } = this.resolveSubjectAndBody(
      input.purposeLabel,
      input.locale,
      input.code,
    );

    const redirectResolution = this.notificationEmailService.resolveOtpTarget(
      input.target,
    );

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
      bodySnapshot: body,
      relatedEntityType: 'OTP_CHALLENGE',
    });

    const delivery = await this.notificationEmailService.sendEmail({
      to: redirectResolution.deliveryTarget,
      subject,
      body,
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
