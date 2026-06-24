import { Injectable } from '@nestjs/common';
import { NotificationStatus } from '@prisma/client';
import { ListAdminNotificationsDto } from '../dto/list-admin-notifications.dto';
import {
  getAdminNotificationFeedExcludedTypePrefixes,
  getAdminNotificationFeedExcludedTypeSlugs,
} from '../policies/admin-notification-feed.policy';
import { NotificationContextEnrichmentService } from '../services/notification-context-enrichment.service';
import { NotificationOpsPresenter } from '../presenters/notification-ops.presenter';
import { OperationalNotificationRepository } from '../repositories/operational-notification.repository';

@Injectable()
export class ListAdminOperationalNotificationsUseCase {
  constructor(
    private readonly repository: OperationalNotificationRepository,
    private readonly presenter: NotificationOpsPresenter,
    private readonly enrichmentService: NotificationContextEnrichmentService,
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

    const [rows, totalItems] =
      await this.repository.listOperationalNotifications({
        statuses,
        excludedTypeSlugs: getAdminNotificationFeedExcludedTypeSlugs(),
        excludedTypePrefixes: getAdminNotificationFeedExcludedTypePrefixes(),
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
      items: rows.map((item) => {
        const enriched = enrichment.get(item.id);
        return this.presenter.toListItem(item, enriched);
      }),
      pagination: this.presenter.presentPagination({ page, limit, totalItems }),
    };
  }
}
