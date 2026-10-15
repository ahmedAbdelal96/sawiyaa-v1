import { Injectable } from '@nestjs/common';
import { NotificationChannel } from '@prisma/client';
import { NotificationEmailService } from './notification-email.service';
import { NotificationPushExecutionService } from './notification-push-execution.service';
import { ConfigService } from '@nestjs/config';
import { renderSessionNotificationEmail } from './session-notification-email.template';
import {
  NotificationProviderExecutionContext,
  NotificationProviderExecutionResult,
} from './notification-provider-outcome';

type QueuedNotification = {
  id: string;
  userId: string;
  channel: NotificationChannel;
  locale: string | null;
  titleSnapshot: string | null;
  subjectSnapshot: string | null;
  bodySnapshot: string | null;
  scheduledFor?: Date | null;
  payloadJson: unknown;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
  notificationType: {
    slug: string;
    category: string;
  };
};

export type ChannelExecutionResult = NotificationProviderExecutionResult;

@Injectable()
export class NotificationChannelExecutionService {
  constructor(
    private readonly notificationEmailService: NotificationEmailService,
    private readonly notificationPushExecutionService: NotificationPushExecutionService,
    private readonly configService: ConfigService,
  ) {}

  getProviderHint(channel: NotificationChannel): string {
    if (channel === NotificationChannel.EMAIL) {
      return this.notificationEmailService.providerName;
    }
    if (channel === NotificationChannel.PUSH) return 'EXPO';
    if (channel === NotificationChannel.IN_APP) return 'IN_APP';
    return 'UNKNOWN';
  }

  async execute(
    notification: QueuedNotification,
    context?: NotificationProviderExecutionContext,
  ): Promise<ChannelExecutionResult> {
    if (notification.channel === NotificationChannel.IN_APP) {
      return {
        success: true,
        provider: 'IN_APP',
        providerOutcome: 'ACCEPTED',
        reconciliationState: 'NOT_REQUIRED',
        responsePayload: { channel: NotificationChannel.IN_APP },
      };
    }

    if (notification.channel === NotificationChannel.EMAIL) {
      return this.executeEmail(notification, context);
    }

    if (notification.channel === NotificationChannel.PUSH) {
      return this.notificationPushExecutionService.execute(
        notification,
        context,
      );
    }

    return {
      success: false,
      provider: 'UNKNOWN',
      providerOutcome: 'FAILED',
      errorCode: 'CHANNEL_UNSUPPORTED',
      errorMessage: `Unsupported notification channel: ${notification.channel}`,
      errorCategory: 'CONFIGURATION',
      providerErrorCode: 'CHANNEL_UNSUPPORTED',
      providerSendAttempted: false,
    };
  }

  private async executeEmail(
    notification: QueuedNotification,
    context?: NotificationProviderExecutionContext,
  ): Promise<ChannelExecutionResult> {
    const payload =
      notification.payloadJson && typeof notification.payloadJson === 'object'
        ? (notification.payloadJson as Record<string, unknown>)
        : null;
    const target = payload?.target;
    const provider = this.notificationEmailService.providerName ?? 'SMTP';

    if (typeof target !== 'string' || target.trim().length === 0) {
      return {
        success: false,
        provider,
        providerOutcome: 'FAILED',
        errorCode: 'EMAIL_TARGET_MISSING',
        errorMessage: 'EMAIL_TARGET_MISSING',
        errorCategory: 'PERMANENT',
        providerErrorCode: 'EMAIL_TARGET_MISSING',
        providerSendAttempted: false,
      };
    }

    const sessionEmail = this.renderSessionEmail(notification, payload);
    if (notification.relatedEntityType === 'SESSION' && !sessionEmail) {
      return {
        success: false,
        provider,
        providerOutcome: 'FAILED',
        errorCode: 'SESSION_EMAIL_RENDER_FAILED',
        errorMessage: 'SESSION_EMAIL_RENDER_FAILED',
        errorCategory: 'PERMANENT',
        providerErrorCode: 'SESSION_EMAIL_RENDER_FAILED',
        providerSendAttempted: false,
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
      ...(context?.operationKey
        ? {
            operationKey: context.operationKey,
            idempotencyKey: context.idempotencyKey,
          }
        : {}),
    });

    if (!delivery.delivered) {
      return {
        success: false,
        provider: delivery.provider ?? provider,
        reconciliationState:
          delivery.providerOutcome === 'UNKNOWN' ? 'PENDING' : 'NOT_REQUIRED',
        providerOutcome: delivery.providerOutcome ?? 'FAILED',
        errorCode: delivery.error ?? 'MAIL_SEND_FAILED',
        errorMessage: delivery.error ?? 'MAIL_SEND_FAILED',
        errorCategory: delivery.errorCategory,
        providerErrorCode: delivery.providerErrorCode,
        retryAfterMs: delivery.retryAfterMs,
        httpStatus: delivery.httpStatus,
        providerRespondedAt: delivery.providerRespondedAt,
        responsePayload: {
          deliveryTarget: delivery.deliveryTarget,
          ...(delivery.responsePayload ?? {}),
        },
      };
    }

    return {
      success: true,
      provider: delivery.provider ?? provider,
      reconciliationState: 'NOT_REQUIRED',
      providerOutcome: delivery.providerOutcome ?? 'ACCEPTED',
      providerMessageRef: delivery.providerMessageId,
      httpStatus: delivery.httpStatus,
      providerRespondedAt: delivery.providerRespondedAt,
      responsePayload: {
        deliveryTarget: delivery.deliveryTarget,
        ...(delivery.responsePayload ?? {}),
      },
    };
  }

  private renderSessionEmail(
    notification: QueuedNotification,
    payload: Record<string, unknown> | null,
  ) {
    if (notification.relatedEntityType !== 'SESSION' || !payload) return null;
    const action = payload.action;
    if (!action || typeof action !== 'object' || Array.isArray(action))
      return null;
    const rawAction = action as Record<string, unknown>;
    const href = typeof rawAction.href === 'string' ? rawAction.href : null;
    const label = typeof rawAction.label === 'string' ? rawAction.label : '';
    const locale = notification.locale === 'ar' ? 'ar' : 'en';
    const publicWebUrl = this.configService.get<string>(
      'notification.web.publicUrl',
    );
    if (!href || !publicWebUrl) return null;
    return renderSessionNotificationEmail({
      locale,
      title:
        notification.titleSnapshot ?? notification.subjectSnapshot ?? 'Sawiyaa',
      body: notification.bodySnapshot ?? '',
      action: { href, label },
      publicWebUrl,
      environment:
        this.configService.get<string>('app.nodeEnv') ??
        process.env.NODE_ENV ??
        'development',
      sessionId:
        typeof payload.sessionId === 'string'
          ? payload.sessionId
          : notification.relatedEntityId,
      recipientRole:
        payload.recipientRole === 'PATIENT' ||
        payload.recipientRole === 'PRACTITIONER'
          ? payload.recipientRole
          : null,
      startsAtUtc:
        typeof payload.startsAtUtc === 'string' ? payload.startsAtUtc : null,
      recipientTimezone:
        typeof payload.timezoneSnapshot === 'string'
          ? payload.timezoneSnapshot
          : null,
      durationMinutes:
        typeof payload.durationMinutes === 'number'
          ? payload.durationMinutes
          : null,
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
      actionType:
        typeof payload.actionType === 'string' ? payload.actionType : null,
    });
  }
}
