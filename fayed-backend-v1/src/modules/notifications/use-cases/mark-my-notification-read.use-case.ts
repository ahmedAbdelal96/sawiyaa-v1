import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { NotificationStatus } from '@prisma/client';
import { AuthenticatedUser } from '@common/interfaces/authenticated-user.interface';
import { UserNotificationsPresenter } from '../presenters/user-notifications.presenter';
import { UserNotificationRepository } from '../repositories/user-notification.repository';

@Injectable()
export class MarkMyNotificationReadUseCase {
  constructor(
    private readonly repository: UserNotificationRepository,
    private readonly presenter: UserNotificationsPresenter,
  ) {}

  async execute(input: {
    authenticatedUser: AuthenticatedUser;
    notificationId: string;
  }) {
    const readableStatuses = new Set<NotificationStatus>([
      NotificationStatus.SENT,
      NotificationStatus.DELIVERED,
      NotificationStatus.READ,
    ]);

    const existing = await this.repository.findMyNotificationById(
      input.authenticatedUser.id,
      input.notificationId,
    );

    if (!existing) {
      throw new NotFoundException({
        messageKey: 'notifications.errors.notificationNotFound',
        errorCode: 'NOTIFICATION_NOT_FOUND',
      });
    }

    if (existing.status === NotificationStatus.SUPPRESSED) {
      throw new ForbiddenException({
        messageKey: 'notifications.errors.notificationNotReadable',
        errorCode: 'NOTIFICATION_NOT_READABLE',
      });
    }

    if (!readableStatuses.has(existing.status)) {
      throw new ForbiddenException({
        messageKey: 'notifications.errors.notificationNotReadable',
        errorCode: 'NOTIFICATION_NOT_READABLE',
      });
    }

    if (existing.readAt) {
      return this.presenter.presentReadResult(existing);
    }

    const now = new Date();
    const updated = await this.repository.markMyNotificationRead({
      userId: input.authenticatedUser.id,
      notificationId: input.notificationId,
      now,
    });

    if (updated.count <= 0) {
      const reloaded = await this.repository.findMyNotificationById(
        input.authenticatedUser.id,
        input.notificationId,
      );

      if (!reloaded) {
        throw new NotFoundException({
          messageKey: 'notifications.errors.notificationNotFound',
          errorCode: 'NOTIFICATION_NOT_FOUND',
        });
      }

      return this.presenter.presentReadResult(reloaded);
    }

    return this.presenter.presentReadResult({
      ...existing,
      readAt: now,
      status: NotificationStatus.READ,
    });
  }
}
