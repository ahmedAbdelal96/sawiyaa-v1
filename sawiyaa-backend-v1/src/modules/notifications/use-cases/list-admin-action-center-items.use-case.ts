import { Injectable } from '@nestjs/common';
import { NotificationStatus } from '@prisma/client';
import { AuthenticatedUser } from '@common/interfaces/authenticated-user.interface';
import { ListAdminNotificationsDto } from '../dto/list-admin-notifications.dto';
import { getAdminActionCenterTypeSlugs } from '../policies/notification-policy.catalog';
import { NotificationContextEnrichmentService } from '../services/notification-context-enrichment.service';
import { NotificationOpsPresenter } from '../presenters/notification-ops.presenter';
import { OperationalNotificationRepository } from '../repositories/operational-notification.repository';

@Injectable()
export class ListAdminActionCenterItemsUseCase {
  constructor(
    private readonly repository: OperationalNotificationRepository,
    private readonly presenter: NotificationOpsPresenter,
    private readonly enrichmentService: NotificationContextEnrichmentService,
  ) {}

  async execute(input: {
    authenticatedUserId: AuthenticatedUser['id'];
    query: ListAdminNotificationsDto;
  }) {
    const page = input.query.page ?? 1;
    const limit = input.query.limit ?? 20;
    const statuses = input.query.status
      ? [input.query.status]
      : [
          NotificationStatus.PENDING,
          NotificationStatus.QUEUED,
          NotificationStatus.SENT,
          NotificationStatus.DELIVERED,
          NotificationStatus.READ,
        ];

    const [rows, totalItems] =
      await this.repository.listAdminActionCenterNotifications({
        userId: input.authenticatedUserId,
        typeSlugs: getAdminActionCenterTypeSlugs(),
        statuses,
        channel: input.query.channel,
        category: input.query.category,
        scheduledFrom: input.query.scheduledFrom
          ? new Date(input.query.scheduledFrom)
          : undefined,
        scheduledTo: input.query.scheduledTo
          ? new Date(input.query.scheduledTo)
          : undefined,
        page,
        limit,
      });

    const enrichment = await this.enrichmentService.enrichMany(rows);

    return {
      items: rows.map((item) =>
        this.presenter.toListItem(item, enrichment.get(item.id)),
      ),
      pagination: this.presenter.presentPagination({ page, limit, totalItems }),
    };
  }
}
