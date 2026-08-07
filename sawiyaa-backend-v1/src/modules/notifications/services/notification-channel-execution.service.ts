import { Injectable } from '@nestjs/common';
import { NotificationChannel, Prisma } from '@prisma/client';
import { NotificationEmailService } from './notification-email.service';
import { NotificationPushExecutionService } from './notification-push-execution.service';
import { ConfigService } from '@nestjs/config';
import { renderSessionNotificationEmail } from './session-notification-email.template';

type QueuedNotification = {
  id: string;
  userId: string;
  channel: NotificationChannel;
  locale: string | null;
  titleSnapshot: string | null;
  subjectSnapshot: string | null;
  bodySnapshot: string | null;
  payloadJson: unknown;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
  notificationType: {
    slug: string;
    category: string;
  };
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
    private readonly configService: ConfigService,
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

    const sessionEmail = this.renderSessionEmail(notification, payload);
    if (notification.relatedEntityType === 'SESSION' && !sessionEmail) {
      return {
        success: false,
        provider: 'SMTP',
        errorCode: 'SESSION_EMAIL_RENDER_FAILED',
        errorMessage: 'SESSION_EMAIL_RENDER_FAILED',
      };
    }
    const delivery = await this.notificationEmailService.sendEmail({
      to: target,
      subject:
        notification.subjectSnapshot ??
        notification.titleSnapshot ??
        'Notification',
      body: sessionEmail?.text ?? notification.bodySnapshot ?? '',
      ...(sessionEmail ? { html: sessionEmail.html } : {}),
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

  private renderSessionEmail(
    notification: QueuedNotification,
    payload: Record<string, unknown> | null,
  ) {
    if (notification.relatedEntityType !== 'SESSION' || !payload) return null;
    const action = payload.action;
    if (!action || typeof action !== 'object' || Array.isArray(action)) return null;
    const rawAction = action as Record<string, unknown>;
    const href = typeof rawAction.href === 'string' ? rawAction.href : null;
    const label = typeof rawAction.label === 'string' ? rawAction.label : '';
    const locale = notification.locale === 'ar' ? 'ar' : 'en';
    const publicWebUrl = this.configService.get<string>('notification.web.publicUrl');
    if (!href || !publicWebUrl) return null;
    return renderSessionNotificationEmail({
      locale,
      title: notification.titleSnapshot ?? notification.subjectSnapshot ?? 'Sawiyaa',
      body: notification.bodySnapshot ?? '',
      action: { href, label },
      publicWebUrl,
      environment: this.configService.get<string>('app.nodeEnv') ?? process.env.NODE_ENV ?? 'development',
      sessionId: typeof payload.sessionId === 'string' ? payload.sessionId : notification.relatedEntityId,
      recipientRole:
        payload.recipientRole === 'PATIENT' || payload.recipientRole === 'PRACTITIONER'
          ? payload.recipientRole
          : null,
      startsAtUtc:
        typeof payload.startsAtUtc === 'string' ? payload.startsAtUtc : null,
      recipientTimezone:
        typeof payload.timezoneSnapshot === 'string' ? payload.timezoneSnapshot : null,
      durationMinutes:
        typeof payload.durationMinutes === 'number' ? payload.durationMinutes : null,
      packageContext:
        typeof payload.packageSessionIndex === 'number' &&
        typeof payload.packageSessionCount === 'number'
          ? {
              sessionIndex: payload.packageSessionIndex,
              sessionCount: payload.packageSessionCount,
              planTitle:
                typeof payload.packagePlanTitle === 'string'
                  ? payload.packagePlanTitle
                  : null,
            }
          : null,
      actionType: typeof payload.actionType === 'string' ? payload.actionType : null,
    });
  }
}
