import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationChannel, NotificationStatus } from '@prisma/client';
import { AuthenticatedUser } from '@common/interfaces/authenticated-user.interface';
import { OperationalNotificationRepository } from '../repositories/operational-notification.repository';
import {
  DevTestPushRequestDto,
  type DevTestPushResultDto,
} from '../dto/dev-test-push.dto';
import { NotificationDeliveryAttemptEngineService } from '../services/notification-delivery-attempt-engine.service';

@Injectable()
export class SendDevTestPushNotificationUseCase {
  constructor(
    private readonly configService: ConfigService,
    private readonly repository: OperationalNotificationRepository,
    private readonly deliveryAttemptEngineService: NotificationDeliveryAttemptEngineService,
  ) {}

  async execute(input: {
    authenticatedUser: AuthenticatedUser;
    dto: DevTestPushRequestDto;
  }): Promise<{ item: DevTestPushResultDto }> {
    this.assertDevOnly();

    const targetUserId = input.dto.userId?.trim() || input.authenticatedUser.id;
    const recipient = await this.repository.findUserRecipient(targetUserId);
    if (!recipient) {
      throw new NotFoundException({
        messageKey: 'notifications.errors.devTestPushTargetNotFound',
        error: 'DEV_TEST_PUSH_TARGET_NOT_FOUND',
      });
    }

    const notificationType = await this.repository.findTypeBySlug(
      'dev.push-test',
    );
    const resolvedNotificationType =
      notificationType ??
      (await this.repository.findTypeBySlug('sessions.session-confirmed'));

    if (!resolvedNotificationType) {
      throw new NotFoundException({
        messageKey: 'notifications.errors.devTestPushTypeMissing',
        error: 'DEV_TEST_PUSH_TYPE_MISSING',
      });
    }

    const locale = recipient.defaultLocale === 'ar' ? 'ar' : 'en';
    const routePath =
      input.dto.routePath?.trim() ??
      `/${locale}/${input.dto.role.toLowerCase()}/notifications`;
    const now = new Date();

    const notification = await this.repository.createNotification({
      userId: recipient.id,
      notificationTypeId: resolvedNotificationType.id,
      templateId: null,
      channel: NotificationChannel.PUSH,
      status: NotificationStatus.PENDING,
      locale,
      titleSnapshot: 'اختبار الإشعارات',
      subjectSnapshot: 'اختبار الإشعارات',
      bodySnapshot:
        'إذا وصلتك هذه الرسالة، فإشعارات الهاتف تعمل بنجاح.',
      payloadJson: {
        targetRole: input.dto.role,
        routePath,
        testPush: true,
      },
      relatedEntityType: 'USER',
      relatedEntityId: recipient.id,
      scheduledFor: now,
    });

    await this.repository.claimNotificationForExecution({
      notificationId: notification.id,
      now,
    });

    const execution =
      await this.deliveryAttemptEngineService.executeClaimedNotification({
        notificationId: notification.id,
        now,
      });

    return {
      item: {
        notificationId: notification.id,
        userId: recipient.id,
        role: input.dto.role,
        routePath,
        outcome: execution.outcome,
        executed: execution.executed,
        attemptId: execution.attemptId ?? null,
        reason: execution.reason ?? null,
      },
    };
  }

  private assertDevOnly() {
    const nodeEnv =
      this.configService.get<string>('app.nodeEnv') ??
      process.env.NODE_ENV ??
      'development';

    if (nodeEnv !== 'development' && nodeEnv !== 'test') {
      throw new NotFoundException({
        messageKey: 'notifications.errors.devTestPushUnavailable',
        error: 'DEV_TEST_PUSH_UNAVAILABLE',
      });
    }
  }
}
