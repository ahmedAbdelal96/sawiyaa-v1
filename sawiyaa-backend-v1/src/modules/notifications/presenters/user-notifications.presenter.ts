import { Injectable } from '@nestjs/common';
import {
  UserNotificationAction,
  UserNotificationFeedItem,
  UserNotificationFeedRow,
  NotificationContext,
  NotificationPrimaryAction,
} from '../types/user-notifications.types';

@Injectable()
export class UserNotificationsPresenter {
  presentList(input: {
    items: UserNotificationFeedRow[];
    page: number;
    limit: number;
    hasNextPage: boolean;
    enrichment: Map<string, { context: NotificationContext; primaryAction: NotificationPrimaryAction }>;
  }) {
    const items = input.items.map((row) => {
      const enriched = input.enrichment.get(row.id) || { context: {}, primaryAction: { kind: 'details' } };
      return this.toListItem(row, enriched.context, enriched.primaryAction);
    });

    return {
      items,
      pagination: {
        page: input.page,
        limit: input.limit,
        hasNextPage: input.hasNextPage,
        nextPage: input.hasNextPage ? input.page + 1 : null,
      },
    };
  }

  presentUnreadCount(unreadCount: number) {
    return {
      item: {
        unreadCount,
      },
    };
  }

  presentReadResult(
    item: UserNotificationFeedRow,
    enrichment: { context: NotificationContext; primaryAction: NotificationPrimaryAction },
  ): {
    item: UserNotificationFeedItem;
  } {
    return {
      item: this.toListItem(item, enrichment.context, enrichment.primaryAction),
    };
  }

  presentBulkReadResult(updatedCount: number) {
    return {
      item: {
        updatedCount,
      },
    };
  }

  toListItem(
    row: UserNotificationFeedRow,
    context?: NotificationContext,
    primaryAction?: NotificationPrimaryAction,
  ): UserNotificationFeedItem {
    const payload = this.normalizePayload(row.payloadJson);
    return {
      id: row.id,
      typeSlug: row.notificationType.slug,
      category: row.notificationType.category,
      title: this.resolveTitle(row),
      body: this.resolveBody(row),
      createdAt: row.createdAt.toISOString(),
      readAt: row.readAt?.toISOString() ?? null,
      action: this.resolveAction(payload),
      payload,
      context,
      primaryAction,
    };
  }

  private resolveTitle(row: UserNotificationFeedRow): string {
    return (
      row.titleSnapshot?.trim() ||
      row.subjectSnapshot?.trim() ||
      row.notificationType.slug
    );
  }

  private resolveBody(row: UserNotificationFeedRow): string {
    return (
      row.bodySnapshot?.trim() ||
      row.subjectSnapshot?.trim() ||
      row.titleSnapshot?.trim() ||
      ''
    );
  }

  private normalizePayload(payload: unknown): Record<string, unknown> {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return {};
    }

    const raw = payload as Record<string, unknown>;
    const normalized: Record<string, unknown> = {};

    if (typeof raw.routePath === 'string' && raw.routePath.startsWith('/')) {
      normalized.routePath = raw.routePath;
    }

    if (typeof raw.sessionId === 'string') {
      normalized.sessionId = raw.sessionId;
    }

    if (
      raw.recipientRole === 'PATIENT' ||
      raw.recipientRole === 'PRACTITIONER'
    ) {
      normalized.recipientRole = raw.recipientRole;
    }

    if (typeof raw.scheduledStartAt === 'string') {
      normalized.scheduledStartAt = raw.scheduledStartAt;
    }

    if (typeof raw.joinOpenAt === 'string' || raw.joinOpenAt === null) {
      normalized.joinOpenAt = raw.joinOpenAt;
    }

    if (typeof raw.ctaLabel === 'string') {
      normalized.ctaLabel = raw.ctaLabel;
    }

    if (typeof raw.relatedEntityType === 'string') {
      normalized.relatedEntityType = raw.relatedEntityType;
    }

    if (typeof raw.relatedEntityId === 'string') {
      normalized.relatedEntityId = raw.relatedEntityId;
    }

    if (typeof raw.category === 'string') {
      normalized.category = raw.category;
    }

    const maybeAction = raw.action;
    if (
      maybeAction &&
      typeof maybeAction === 'object' &&
      !Array.isArray(maybeAction)
    ) {
      const action = maybeAction as Record<string, unknown>;
      const type = typeof action.type === 'string' ? action.type : null;
      const href = typeof action.href === 'string' ? action.href : null;
      const label = typeof action.label === 'string' ? action.label : null;

      if (type === 'INTERNAL_LINK' && href && href.startsWith('/')) {
        normalized.action = {
          type,
          href,
          label,
        };
      }
    }

    return normalized;
  }

  private resolveAction(
    payload: Record<string, unknown>,
  ): UserNotificationAction | null {
    const maybeAction = payload.action;

    if (
      maybeAction &&
      typeof maybeAction === 'object' &&
      !Array.isArray(maybeAction)
    ) {
      const action = maybeAction as Record<string, unknown>;
      const type = typeof action.type === 'string' ? action.type : null;
      const href = typeof action.href === 'string' ? action.href : null;
      const label = typeof action.label === 'string' ? action.label : null;

      if (type === 'INTERNAL_LINK' && href && href.startsWith('/')) {
        return {
          type: 'INTERNAL_LINK',
          href,
          label,
        };
      }
    }

    const routePath =
      typeof payload.routePath === 'string' ? payload.routePath : null;
    if (routePath && routePath.startsWith('/')) {
      const label =
        typeof payload.ctaLabel === 'string' ? payload.ctaLabel : null;
      return {
        type: 'INTERNAL_LINK',
        href: routePath,
        label,
      };
    }

    return null;
  }
}
