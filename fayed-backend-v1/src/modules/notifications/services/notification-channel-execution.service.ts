import { Injectable } from '@nestjs/common';
import { NotificationChannel, Prisma } from '@prisma/client';
import { NotificationEmailService } from './notification-email.service';
import { NotificationPushExecutionService } from './notification-push-execution.service';

type QueuedNotification = {
  id: string;
  userId: string;
  channel: NotificationChannel;
  titleSnapshot: string | null;
  subjectSnapshot: string | null;
  bodySnapshot: string | null;
  payloadJson: unknown;
};

export type ChannelExecutionResult = {
  success: boolean;
  provider: string;
  errorCode?: string;
  errorMessage?: string;
  providerMessageRef?: string;
  responsePayload?: Prisma.InputJsonValue;
};

@Injectable()
export class NotificationChannelExecutionService {
  constructor(
    private readonly notificationEmailService: NotificationEmailService,
    private readonly notificationPushExecutionService: NotificationPushExecutionService,
  ) {}

  async execute(
    notification: QueuedNotification,
  ): Promise<ChannelExecutionResult> {
    if (notification.channel === NotificationChannel.IN_APP) {
      return {
        success: true,
        provider: 'IN_APP',
        responsePayload: { channel: NotificationChannel.IN_APP },
      };
    }

    if (notification.channel === NotificationChannel.EMAIL) {
      return this.executeEmail(notification);
    }

    if (notification.channel === NotificationChannel.PUSH) {
      return this.notificationPushExecutionService.execute(notification);
    }

    return {
      success: false,
      provider: 'UNKNOWN',
      errorCode: 'CHANNEL_UNSUPPORTED',
      errorMessage: `Unsupported notification channel: ${notification.channel}`,
    };
  }

  private async executeEmail(
    notification: QueuedNotification,
  ): Promise<ChannelExecutionResult> {
    const payload =
      notification.payloadJson && typeof notification.payloadJson === 'object'
        ? (notification.payloadJson as Record<string, unknown>)
        : null;
    const target = payload?.target;

    if (typeof target !== 'string' || target.trim().length === 0) {
      return {
        success: false,
        provider: 'SMTP',
        errorCode: 'EMAIL_TARGET_MISSING',
        errorMessage: 'EMAIL_TARGET_MISSING',
      };
    }

    const delivery = await this.notificationEmailService.sendEmail({
      to: target,
      subject:
        notification.subjectSnapshot ??
        notification.titleSnapshot ??
        'Notification',
      body: notification.bodySnapshot ?? '',
      notificationId: notification.id,
      isOtp: false,
    });

    if (!delivery.delivered) {
      return {
        success: false,
        provider: 'SMTP',
        errorCode: delivery.error ?? 'MAIL_SEND_FAILED',
        errorMessage: delivery.error ?? 'MAIL_SEND_FAILED',
        responsePayload: {
          deliveryTarget: delivery.deliveryTarget,
        },
      };
    }

    return {
      success: true,
      provider: 'SMTP',
      responsePayload: {
        deliveryTarget: delivery.deliveryTarget,
      },
    };
  }
}
