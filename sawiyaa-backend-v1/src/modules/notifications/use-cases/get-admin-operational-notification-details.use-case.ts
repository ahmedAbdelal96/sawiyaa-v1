import { Injectable, NotFoundException } from '@nestjs/common';
import {
  getAdminNotificationFeedExcludedTypePrefixes,
  getAdminNotificationFeedExcludedTypeSlugs,
} from '../policies/admin-notification-feed.policy';
import { NotificationContextEnrichmentService } from '../services/notification-context-enrichment.service';
import { NotificationOpsPresenter } from '../presenters/notification-ops.presenter';
import { OperationalNotificationRepository } from '../repositories/operational-notification.repository';

@Injectable()
export class GetAdminOperationalNotificationDetailsUseCase {
  constructor(
    private readonly repository: OperationalNotificationRepository,
    private readonly presenter: NotificationOpsPresenter,
    private readonly enrichmentService: NotificationContextEnrichmentService,
  ) {}

  async execute(input: { notificationId: string }) {
    const notification = await this.repository.findOperationalNotificationById(
      input.notificationId,
      getAdminNotificationFeedExcludedTypeSlugs(),
      getAdminNotificationFeedExcludedTypePrefixes(),
    );

    if (!notification) {
      throw new NotFoundException({
        messageKey: 'notifications.errors.notificationNotFound',
        error: 'NOTIFICATION_NOT_FOUND',
      });
    }

    const enrichment = await this.enrichmentService.enrichOne(notification);

    return {
      item: this.presenter.toDetailItem(notification, enrichment),
    };
  }
}
