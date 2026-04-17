import { Injectable, NotFoundException } from '@nestjs/common';
import { NotificationOpsPresenter } from '../presenters/notification-ops.presenter';
import { OperationalNotificationRepository } from '../repositories/operational-notification.repository';

@Injectable()
export class GetAdminOperationalNotificationDetailsUseCase {
  constructor(
    private readonly repository: OperationalNotificationRepository,
    private readonly presenter: NotificationOpsPresenter,
  ) {}

  async execute(input: { notificationId: string }) {
    const notification = await this.repository.findOperationalNotificationById(
      input.notificationId,
    );

    if (!notification) {
      throw new NotFoundException({
        messageKey: 'notifications.errors.notificationNotFound',
        error: 'NOTIFICATION_NOT_FOUND',
      });
    }

    return {
      item: this.presenter.toDetailItem(notification),
    };
  }
}
