import { Injectable } from '@nestjs/common';
import {
  AuditEventSource,
  NotificationChannel,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';

/**
 * Minimal notification persistence abstraction for admin practitioner-application decisions.
 * If notification-type seeds are missing, upper layers can fail open by design.
 */
@Injectable()
export class AdminNotificationRepository {
  constructor(private readonly prisma: PrismaService) {}

  findTypeBySlug(slug: string) {
    return this.prisma.notificationType.findUnique({
      where: { slug },
      include: {
        templates: {
          where: { isActive: true },
          orderBy: [{ channel: 'asc' }, { version: 'desc' }],
        },
      },
    });
  }

  createNotification(data: Prisma.NotificationUncheckedCreateInput) {
    return this.inTransaction(async (tx) => {
      const created = await tx.notification.create({ data });
      await this.upsertAuditEventFromNotification(tx, created.id);
      return created;
    });
  }

  private async upsertAuditEventFromNotification(
    tx: Prisma.TransactionClient,
    notificationId: string,
  ) {
    const txWithAudit = tx as Prisma.TransactionClient & {
      auditEvent?: { upsert: (args: Prisma.AuditEventUpsertArgs) => Promise<unknown> };
    };

    if (!txWithAudit.auditEvent) {
      return;
    }

    const row = await tx.notification.findUnique({
      where: { id: notificationId },
      select: {
        id: true,
        userId: true,
        channel: true,
        status: true,
        titleSnapshot: true,
        subjectSnapshot: true,
        bodySnapshot: true,
        payloadJson: true,
        relatedEntityType: true,
        relatedEntityId: true,
        suppressedReason: true,
        createdAt: true,
        updatedAt: true,
        notificationType: {
          select: {
            slug: true,
            category: true,
          },
        },
      },
    });

    if (!row) {
      return;
    }

    await txWithAudit.auditEvent.upsert({
      where: { notificationId: row.id },
      create: {
        notificationId: row.id,
        typeSlug: row.notificationType.slug,
        eventFamily: this.resolveEventFamily(row.notificationType.slug),
        category: row.notificationType.category,
        status: row.status,
        source: this.mapNotificationChannelToAuditSource(row.channel),
        actorUserId: row.userId,
        targetEntityType: row.relatedEntityType,
        targetEntityId: row.relatedEntityId,
        titleSnapshot: row.titleSnapshot,
        subjectSnapshot: row.subjectSnapshot,
        bodySnapshot: row.bodySnapshot,
        suppressedReason: row.suppressedReason,
        metadataJson: row.payloadJson ?? Prisma.JsonNull,
        occurredAt: row.updatedAt,
        createdAt: row.createdAt,
      },
      update: {
        typeSlug: row.notificationType.slug,
        eventFamily: this.resolveEventFamily(row.notificationType.slug),
        category: row.notificationType.category,
        status: row.status,
        source: this.mapNotificationChannelToAuditSource(row.channel),
        actorUserId: row.userId,
        targetEntityType: row.relatedEntityType,
        targetEntityId: row.relatedEntityId,
        titleSnapshot: row.titleSnapshot,
        subjectSnapshot: row.subjectSnapshot,
        bodySnapshot: row.bodySnapshot,
        suppressedReason: row.suppressedReason,
        metadataJson: row.payloadJson ?? Prisma.JsonNull,
        occurredAt: row.updatedAt,
      },
    });
  }

  private resolveEventFamily(slug: string): string {
    return (slug.split('.')[0] ?? 'system').toLowerCase();
  }

  private mapNotificationChannelToAuditSource(
    channel: NotificationChannel,
  ): AuditEventSource {
    if (channel === NotificationChannel.IN_APP) return AuditEventSource.IN_APP;
    if (channel === NotificationChannel.EMAIL) return AuditEventSource.EMAIL;
    if (channel === NotificationChannel.SMS) return AuditEventSource.SMS;
    if (channel === NotificationChannel.PUSH) return AuditEventSource.PUSH;
    return AuditEventSource.SYSTEM;
  }

  private inTransaction<T>(
    work: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    const prismaWithOptionalTransaction = this.prisma as PrismaService & {
      $transaction?: <R>(
        fn: (tx: Prisma.TransactionClient) => Promise<R>,
      ) => Promise<R>;
    };

    if (typeof prismaWithOptionalTransaction.$transaction === 'function') {
      return prismaWithOptionalTransaction.$transaction((tx) => work(tx));
    }

    return work(this.prisma as unknown as Prisma.TransactionClient);
  }
}
