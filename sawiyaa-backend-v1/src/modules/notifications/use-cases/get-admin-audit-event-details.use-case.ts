import { Injectable, NotFoundException } from '@nestjs/common';
import { AdminAuditPresenter } from '../presenters/admin-audit.presenter';
import { OperationalNotificationRepository } from '../repositories/operational-notification.repository';

@Injectable()
export class GetAdminAuditEventDetailsUseCase {
  constructor(
    private readonly repository: OperationalNotificationRepository,
    private readonly presenter: AdminAuditPresenter,
  ) {}

  async execute(input: { eventId: string }) {
    const notification = await this.repository.findAdminAuditEventById(
      input.eventId,
    );

    if (!notification) {
      throw new NotFoundException({
        messageKey: 'notifications.errors.notificationNotFound',
        error: 'AUDIT_EVENT_NOT_FOUND',
      });
    }

    return {
      item: this.presenter.toDetailItem(notification),
    };
  }
}
