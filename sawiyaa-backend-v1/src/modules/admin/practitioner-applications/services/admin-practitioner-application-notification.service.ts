import { Injectable, Logger } from '@nestjs/common';
import {
  NotificationChannel,
  NotificationStatus,
  Prisma,
} from '@prisma/client';
import { I18nService } from '@common/i18n/services/i18n.service';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { AdminNotificationRepository } from '../repositories/admin-notification.repository';

/**
 * Minimal admin-decision notification integration.
 * Decision workflows should remain reliable even if notification-type seeds are not present yet.
 */
@Injectable()
export class AdminPractitionerApplicationNotificationService {
  private readonly logger = new Logger(
    AdminPractitionerApplicationNotificationService.name,
  );

  constructor(
    private readonly i18nService: I18nService,
    private readonly adminNotificationRepository: AdminNotificationRepository,
  ) {}

  async sendApproved(input: {
    userId: string;
    applicationId: string;
    locale: SupportedLocale;
  }): Promise<void> {
    try {
      await this.queue({
        slug: 'admin.practitioner-application-approved',
        userId: input.userId,
        locale: input.locale,
        titleKey: 'admin.practitionerApplications.notifications.approvedTitle',
        bodyKey: 'admin.practitionerApplications.notifications.approvedBody',
        relatedEntityId: input.applicationId,
      });
    } catch (error) {
      this.logger.warn(
        `Best-effort notification failed for approved application "${input.applicationId}": ${(error as Error).message}`,
      );
    }
  }

  async sendRejected(input: {
    userId: string;
    applicationId: string;
    locale: SupportedLocale;
    reason: string;
  }): Promise<void> {
    try {
      await this.queue({
        slug: 'admin.practitioner-application-rejected',
        userId: input.userId,
        locale: input.locale,
        titleKey: 'admin.practitionerApplications.notifications.rejectedTitle',
        bodyKey: 'admin.practitionerApplications.notifications.rejectedBody',
        bodyParams: { reason: input.reason },
        relatedEntityId: input.applicationId,
      });
    } catch (error) {
      this.logger.warn(
        `Best-effort notification failed for rejected application "${input.applicationId}": ${(error as Error).message}`,
      );
    }
  }

  async sendChangesRequested(input: {
    userId: string;
    applicationId: string;
    locale: SupportedLocale;
    reason: string;
  }): Promise<void> {
    try {
      await this.queue({
        slug: 'admin.practitioner-application-changes-requested',
        userId: input.userId,
        locale: input.locale,
        titleKey:
          'admin.practitionerApplications.notifications.changesRequestedTitle',
        bodyKey:
          'admin.practitionerApplications.notifications.changesRequestedBody',
        bodyParams: { reason: input.reason },
        relatedEntityId: input.applicationId,
      });
    } catch (error) {
      this.logger.warn(
        `Best-effort notification failed for changes-requested application "${input.applicationId}": ${(error as Error).message}`,
      );
    }
  }

  private async queue(input: {
    slug: string;
    userId: string;
    locale: SupportedLocale;
    titleKey: string;
    bodyKey: string;
    bodyParams?: Record<string, string>;
    relatedEntityId: string;
  }): Promise<void> {
    const notificationType =
      await this.adminNotificationRepository.findTypeBySlug(input.slug);

    if (!notificationType) {
      this.logger.warn(
        `Notification type "${input.slug}" is not seeded yet; decision flow continued without queueing notification`,
      );
      return;
    }

    const template =
      notificationType.templates.find(
        (candidate) => candidate.channel === NotificationChannel.IN_APP,
      ) ?? notificationType.templates[0];

    await this.adminNotificationRepository.createNotification({
      userId: input.userId,
      notificationTypeId: notificationType.id,
      templateId: template?.id ?? null,
      channel: template?.channel ?? NotificationChannel.IN_APP,
      status: NotificationStatus.PENDING,
      payloadJson: {
        applicationId: input.relatedEntityId,
      } as Prisma.InputJsonValue,
      titleSnapshot: this.i18nService.t(input.titleKey, input.locale),
      bodySnapshot: this.i18nService.t(
        input.bodyKey,
        input.locale,
        input.bodyParams,
      ),
      relatedEntityType: 'PRACTITIONER_APPLICATION',
      relatedEntityId: input.relatedEntityId,
    });
  }
}
