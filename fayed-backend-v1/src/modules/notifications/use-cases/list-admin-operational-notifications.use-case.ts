import { Injectable } from '@nestjs/common';
import { NotificationStatus } from '@prisma/client';
import { ListAdminNotificationsDto } from '../dto/list-admin-notifications.dto';
import { NotificationOpsPresenter } from '../presenters/notification-ops.presenter';
import { OperationalNotificationRepository } from '../repositories/operational-notification.repository';

@Injectable()
export class ListAdminOperationalNotificationsUseCase {
  constructor(
    private readonly repository: OperationalNotificationRepository,
    private readonly presenter: NotificationOpsPresenter,
  ) {}

  async execute(input: { query: ListAdminNotificationsDto }) {
    const page = input.query.page ?? 1;
    const limit = input.query.limit ?? 20;
    const statuses = input.query.status
      ? [input.query.status]
      : [
          NotificationStatus.PENDING,
          NotificationStatus.QUEUED,
          NotificationStatus.FAILED,
          NotificationStatus.SUPPRESSED,
        ];

    const [rows, totalItems] = await this.repository.listOperationalNotifications({
      statuses,
      channel: input.query.channel,
      category: input.query.category,
      scheduledFrom: input.query.scheduledFrom
        ? new Date(input.query.scheduledFrom)
        : undefined,
      scheduledTo: input.query.scheduledTo ? new Date(input.query.scheduledTo) : undefined,
      page,
      limit,
    });

    return {
      items: rows.map((item) => this.presenter.toListItem(item)),
      pagination: this.presenter.presentPagination({ page, limit, totalItems }),
    };
  }
}
