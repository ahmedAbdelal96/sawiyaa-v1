import { Injectable } from '@nestjs/common';
import {
  AuditEventSource,
  NotificationCategory,
  NotificationStatus,
  UserRoleType,
} from '@prisma/client';
import {
  AdminAuditSeverity,
  AdminAuditSource,
} from '../dto/list-admin-audit-events.dto';

type ActorRoleRecord = { role: UserRoleType };

@Injectable()
export class AdminAuditPresenter {
  presentPagination(input: {
    page: number;
    limit: number;
    totalItems: number;
  }) {
    return {
      page: input.page,
      limit: input.limit,
      totalItems: input.totalItems,
      totalPages: Math.max(1, Math.ceil(input.totalItems / input.limit)),
    };
  }

  toListItem(input: {
    id: string;
    typeSlug: string;
    category: NotificationCategory;
    status: NotificationStatus;
    source: AuditEventSource;
    actorUserId: string | null;
    targetEntityType: string | null;
    targetEntityId: string | null;
    occurredAt: Date;
    createdAt: Date;
    updatedAt: Date;
    actorUser: {
      displayName: string | null;
      roles: ActorRoleRecord[];
    } | null;
  }) {
    const action = input.typeSlug;
    const actorRole = input.actorUser?.roles[0]?.role ?? null;

    return {
      id: input.id,
      action,
      eventFamily: this.resolveEventFamily(action),
      category: input.category,
      severity: this.resolveSeverity(input.status),
      source: this.resolveSource(input.source),
      status: input.status,
      occurredAt: input.occurredAt.toISOString(),
      actor: {
        userId: input.actorUserId,
        displayName: input.actorUser?.displayName ?? null,
        role: actorRole,
      },
      target: {
        entityType: input.targetEntityType,
        entityId: input.targetEntityId,
      },
    };
  }

  toDetailItem(input: {
    id: string;
    typeSlug: string;
    category: NotificationCategory;
    status: NotificationStatus;
    source: AuditEventSource;
    actorUserId: string | null;
    targetEntityType: string | null;
    targetEntityId: string | null;
    occurredAt: Date;
    titleSnapshot: string | null;
    subjectSnapshot: string | null;
    bodySnapshot: string | null;
    suppressedReason: string | null;
    createdAt: Date;
    updatedAt: Date;
    actorUser: {
      displayName: string | null;
      roles: ActorRoleRecord[];
    } | null;
  }) {
    return {
      ...this.toListItem(input),
      titleSnapshot: input.titleSnapshot,
      subjectSnapshot: input.subjectSnapshot,
      bodySnapshot: input.bodySnapshot,
      suppressedReason: input.suppressedReason,
      createdAt: input.createdAt.toISOString(),
      updatedAt: input.updatedAt.toISOString(),
    };
  }

  private resolveEventFamily(slug: string): string {
    if (slug.startsWith('security.adminUsers.')) {
      return 'ADMIN';
    }

    if (
      slug.startsWith('security.step_up.') ||
      slug.startsWith('security.permission.')
    ) {
      return 'AUTH';
    }

    const family = slug.split('.')[0] ?? 'system';
    return family.toUpperCase();
  }

  private resolveSource(source: AuditEventSource): AdminAuditSource {
    if (source === AuditEventSource.EMAIL) return AdminAuditSource.EMAIL;
    if (source === AuditEventSource.SMS) return AdminAuditSource.SMS;
    if (source === AuditEventSource.PUSH) return AdminAuditSource.PUSH;
    if (source === AuditEventSource.IN_APP) return AdminAuditSource.IN_APP;
    return AdminAuditSource.SYSTEM;
  }

  private resolveSeverity(status: NotificationStatus): AdminAuditSeverity {
    if (status === NotificationStatus.FAILED)
      return AdminAuditSeverity.CRITICAL;
    if (
      status === NotificationStatus.SUPPRESSED ||
      status === NotificationStatus.CANCELLED
    ) {
      return AdminAuditSeverity.HIGH;
    }
    if (
      status === NotificationStatus.PENDING ||
      status === NotificationStatus.QUEUED
    ) {
      return AdminAuditSeverity.MEDIUM;
    }
    return AdminAuditSeverity.LOW;
  }
}
