import { Injectable, Logger } from '@nestjs/common';
import { NotificationCategory, NotificationChannel } from '@prisma/client';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { UserNotificationRepository } from '../repositories/user-notification.repository';

@Injectable()
export class NotificationIntentWriterService {
  private readonly logger = new Logger(NotificationIntentWriterService.name);

  constructor(private readonly repository: UserNotificationRepository) {}

  async createInAppNotification(input: {
    slug: string;
    userId: string;
    locale?: SupportedLocale | null;
    title: string;
    body: string;
    payload?: Record<string, unknown>;
    relatedEntityType?: string | null;
    relatedEntityId?: string | null;
    scheduledFor?: Date | null;
    idempotencyKey?: string | null;
    category?: NotificationCategory;
  }) {
    try {
      const notificationType = await this.repository.findTypeBySlug(input.slug);
      if (!notificationType) {
        this.logger.warn(
          `Notification type "${input.slug}" is missing; in-app notification was skipped`,
        );
        return null;
      }

      if (!notificationType.supportsInApp) {
        this.logger.warn(
          `Notification type "${input.slug}" does not support in-app delivery; in-app notification was skipped`,
        );
        return null;
      }

      const pref = await this.repository.findPreference({
        userId: input.userId,
        notificationTypeId: notificationType.id,
        channel: NotificationChannel.IN_APP,
      });

      const templateId =
        notificationType.templates.find(
          (template) => template.channel === NotificationChannel.IN_APP,
        )?.id ?? null;

      return this.repository.createInAppNotification({
        userId: input.userId,
        notificationTypeId: notificationType.id,
        templateId,
        locale: input.locale ?? null,
        titleSnapshot: input.title,
        bodySnapshot: input.body,
        payloadJson: {
          ...(input.payload ?? {}),
          ...(input.idempotencyKey
            ? { idempotencyKey: input.idempotencyKey }
            : {}),
          ...(input.category ? { category: input.category } : {}),
          ...(input.relatedEntityType
            ? { relatedEntityType: input.relatedEntityType }
            : {}),
          ...(input.relatedEntityId
            ? { relatedEntityId: input.relatedEntityId }
            : {}),
        },
        relatedEntityType: input.relatedEntityType ?? null,
        relatedEntityId: input.relatedEntityId ?? null,
        scheduledFor: input.scheduledFor ?? null,
        idempotencyKey: input.idempotencyKey ?? null,
        isSuppressed: pref ? !pref.isEnabled : false,
      });
    } catch (error) {
      this.logger.warn(
        `In-app notification write failed for "${input.slug}": ${(error as Error).message}`,
      );
      return null;
    }
  }

  async createEmailNotification(input: {
    slug: string;
    userId: string;
    email?: string | null;
    locale?: SupportedLocale | null;
    subject: string;
    title: string;
    body: string;
    payload?: Record<string, unknown>;
    relatedEntityType?: string | null;
    relatedEntityId?: string | null;
    scheduledFor?: Date | null;
    idempotencyKey?: string | null;
    category?: NotificationCategory;
  }) {
    if (!input.email?.trim()) {
      this.logger.warn(
        `Email notification write for "${input.slug}" skipped because no recipient email was available`,
      );
      return null;
    }

    try {
      const notificationType = await this.repository.findTypeBySlug(input.slug);
      if (!notificationType) {
        this.logger.warn(
          `Notification type "${input.slug}" is missing; email notification was skipped`,
        );
        return null;
      }

      if (!notificationType.supportsEmail) {
        this.logger.warn(
          `Notification type "${input.slug}" does not support email delivery; email notification was skipped`,
        );
        return null;
      }

      const pref = await this.repository.findPreference({
        userId: input.userId,
        notificationTypeId: notificationType.id,
        channel: NotificationChannel.EMAIL,
      });

      const templateId =
        notificationType.templates.find(
          (template) => template.channel === NotificationChannel.EMAIL,
        )?.id ?? null;

      return this.repository.createEmailNotification({
        userId: input.userId,
        notificationTypeId: notificationType.id,
        templateId,
        locale: input.locale ?? null,
        subjectSnapshot: input.subject,
        titleSnapshot: input.title,
        bodySnapshot: input.body,
        payloadJson: {
          target: input.email,
          ...(input.payload ?? {}),
          ...(input.idempotencyKey
            ? { idempotencyKey: input.idempotencyKey }
            : {}),
          ...(input.category ? { category: input.category } : {}),
          ...(input.relatedEntityType
            ? { relatedEntityType: input.relatedEntityType }
            : {}),
          ...(input.relatedEntityId
            ? { relatedEntityId: input.relatedEntityId }
            : {}),
        },
        relatedEntityType: input.relatedEntityType ?? null,
        relatedEntityId: input.relatedEntityId ?? null,
        scheduledFor: input.scheduledFor ?? new Date(),
        idempotencyKey: input.idempotencyKey ?? null,
        isSuppressed: pref ? !pref.isEnabled : false,
      });
    } catch (error) {
      this.logger.warn(
        `Email notification write failed for "${input.slug}": ${(error as Error).message}`,
      );
      return null;
    }
  }
}
