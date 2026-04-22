import { Injectable } from '@nestjs/common';
import {
  AuditEventSource,
  NotificationCategory,
  NotificationChannel,
  NotificationStatus,
  Prisma,
  UserRoleType,
} from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import {
  AdminAuditSeverity,
  AdminAuditSource,
} from '../dto/list-admin-audit-events.dto';

@Injectable()
export class OperationalNotificationRepository {
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

  findPatientRecipient(patientProfileId: string) {
    return this.prisma.patientProfile.findUnique({
      where: { id: patientProfileId },
      select: {
        user: {
          select: {
            id: true,
            displayName: true,
            defaultLocale: true,
            emails: {
              where: { isPrimary: true },
              take: 1,
              select: {
                email: true,
                isVerified: true,
              },
            },
          },
        },
      },
    });
  }

  findPractitionerRecipient(practitionerProfileId: string) {
    return this.prisma.practitionerProfile.findUnique({
      where: { id: practitionerProfileId },
      select: {
        user: {
          select: {
            id: true,
            displayName: true,
            defaultLocale: true,
            emails: {
              where: { isPrimary: true },
              take: 1,
              select: {
                email: true,
                isVerified: true,
              },
            },
          },
        },
      },
    });
  }

  findUserRecipient(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        displayName: true,
        defaultLocale: true,
        emails: {
          where: { isPrimary: true },
          take: 1,
          select: {
            email: true,
            isVerified: true,
          },
        },
      },
    });
  }

  findPreference(input: {
    userId: string;
    notificationTypeId: string;
    channel: NotificationChannel;
  }) {
    return this.prisma.notificationPreference.findUnique({
      where: {
        userId_notificationTypeId_channel: {
          userId: input.userId,
          notificationTypeId: input.notificationTypeId,
          channel: input.channel,
        },
      },
      select: {
        isEnabled: true,
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

  updateNotificationStatus(
    notificationId: string,
    data: Pick<
      Prisma.NotificationUpdateInput,
      'status' | 'sentAt' | 'failedAt' | 'suppressedReason'
    >,
  ) {
    return this.inTransaction(async (tx) => {
      const updated = await tx.notification.update({
        where: { id: notificationId },
        data,
      });
      await this.upsertAuditEventFromNotification(tx, updated.id);
      return updated;
    });
  }

  listDueNotificationIds(input: { now: Date; limit: number }) {
    return this.prisma.notification.findMany({
      where: {
        status: NotificationStatus.PENDING,
        scheduledFor: {
          not: null,
          lte: input.now,
        },
      },
      orderBy: [{ scheduledFor: 'asc' }, { createdAt: 'asc' }],
      take: input.limit,
      select: {
        id: true,
      },
    });
  }

  claimNotificationForExecution(input: { notificationId: string; now: Date }) {
    return this.inTransaction(async (tx) => {
      const updated = await tx.notification.updateMany({
        where: {
          id: input.notificationId,
          status: NotificationStatus.PENDING,
          scheduledFor: {
            not: null,
            lte: input.now,
          },
        },
        data: {
          status: NotificationStatus.QUEUED,
        },
      });

      if (updated.count > 0) {
        await this.upsertAuditEventFromNotification(tx, input.notificationId);
      }

      return updated;
    });
  }

  findQueuedNotificationForExecution(notificationId: string) {
    return this.prisma.notification.findFirst({
      where: {
        id: notificationId,
        status: NotificationStatus.QUEUED,
      },
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
        notificationType: {
          select: {
            slug: true,
            category: true,
          },
        },
      },
    });
  }

  getNextDeliveryAttemptNumber(notificationId: string) {
    return this.prisma.notificationDeliveryAttempt.count({
      where: { notificationId },
    });
  }

  createDeliveryAttempt(data: Prisma.NotificationDeliveryAttemptCreateInput) {
    return this.prisma.notificationDeliveryAttempt.create({ data });
  }

  updateDeliveryAttempt(
    attemptId: string,
    data: Prisma.NotificationDeliveryAttemptUpdateInput,
  ) {
    return this.prisma.notificationDeliveryAttempt.update({
      where: { id: attemptId },
      data,
    });
  }

  markQueuedNotificationSent(input: { notificationId: string; sentAt: Date }) {
    return this.inTransaction(async (tx) => {
      const updated = await tx.notification.updateMany({
        where: {
          id: input.notificationId,
          status: NotificationStatus.QUEUED,
        },
        data: {
          status: NotificationStatus.SENT,
          scheduledFor: null,
          sentAt: input.sentAt,
          failedAt: null,
          suppressedReason: null,
        },
      });

      if (updated.count > 0) {
        await this.upsertAuditEventFromNotification(tx, input.notificationId);
      }

      return updated;
    });
  }

  rescheduleQueuedNotificationForRetry(input: {
    notificationId: string;
    retryAt: Date;
  }) {
    return this.inTransaction(async (tx) => {
      const updated = await tx.notification.updateMany({
        where: {
          id: input.notificationId,
          status: NotificationStatus.QUEUED,
        },
        data: {
          status: NotificationStatus.PENDING,
          scheduledFor: input.retryAt,
          failedAt: null,
        },
      });

      if (updated.count > 0) {
        await this.upsertAuditEventFromNotification(tx, input.notificationId);
      }

      return updated;
    });
  }

  markQueuedNotificationFailed(input: {
    notificationId: string;
    failedAt: Date;
    reason: string;
  }) {
    return this.inTransaction(async (tx) => {
      const updated = await tx.notification.updateMany({
        where: {
          id: input.notificationId,
          status: NotificationStatus.QUEUED,
        },
        data: {
          status: NotificationStatus.FAILED,
          scheduledFor: null,
          failedAt: input.failedAt,
          suppressedReason: input.reason.slice(0, 500),
        },
      });

      if (updated.count > 0) {
        await this.upsertAuditEventFromNotification(tx, input.notificationId);
      }

      return updated;
    });
  }

  markQueuedNotificationSuppressed(input: {
    notificationId: string;
    reason: string;
  }) {
    return this.inTransaction(async (tx) => {
      const updated = await tx.notification.updateMany({
        where: {
          id: input.notificationId,
          status: NotificationStatus.QUEUED,
        },
        data: {
          status: NotificationStatus.SUPPRESSED,
          scheduledFor: null,
          suppressedReason: input.reason.slice(0, 500),
        },
      });

      if (updated.count > 0) {
        await this.upsertAuditEventFromNotification(tx, input.notificationId);
      }

      return updated;
    });
  }

  findSessionDeliveryGuardState(sessionId: string) {
    return this.prisma.session.findUnique({
      where: { id: sessionId },
      select: {
        status: true,
      },
    });
  }

  findTrainingEnrollmentDeliveryGuardState(enrollmentId: string) {
    return this.prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      select: {
        enrollmentStatus: true,
        courseSchedule: {
          select: {
            status: true,
          },
        },
      },
    });
  }

  findPaymentDeliveryGuardState(paymentId: string) {
    return this.prisma.payment.findUnique({
      where: { id: paymentId },
      select: {
        status: true,
      },
    });
  }

  findRefundDeliveryGuardState(refundId: string) {
    return this.prisma.refund.findUnique({
      where: { id: refundId },
      select: {
        status: true,
      },
    });
  }

  listOperationalNotifications(input: {
    statuses: NotificationStatus[];
    excludedTypeSlugs?: string[];
    excludedTypePrefixes?: string[];
    channel?: NotificationChannel;
    category?: NotificationCategory;
    scheduledFrom?: Date;
    scheduledTo?: Date;
    page: number;
    limit: number;
  }) {
    const skip = (input.page - 1) * input.limit;
    const exclusionRules: Prisma.NotificationTypeWhereInput[] = [];

    for (const excludedSlug of input.excludedTypeSlugs ?? []) {
      exclusionRules.push({ slug: excludedSlug });
    }

    for (const excludedPrefix of input.excludedTypePrefixes ?? []) {
      exclusionRules.push({ slug: { startsWith: excludedPrefix } });
    }

    const where: Prisma.NotificationWhereInput = {
      status: { in: input.statuses },
      channel: input.channel,
      notificationType:
        input.category || exclusionRules.length > 0
          ? {
              category: input.category,
              NOT: exclusionRules.length > 0 ? exclusionRules : undefined,
            }
          : undefined,
      scheduledFor:
        input.scheduledFrom || input.scheduledTo
          ? {
              gte: input.scheduledFrom,
              lte: input.scheduledTo,
            }
          : undefined,
    };

    return this.prisma.$transaction([
      this.prisma.notification.findMany({
        where,
        orderBy: [{ scheduledFor: 'asc' }, { updatedAt: 'desc' }],
        skip,
        take: input.limit,
        select: {
          id: true,
          status: true,
          channel: true,
          userId: true,
          relatedEntityType: true,
          relatedEntityId: true,
          scheduledFor: true,
          sentAt: true,
          failedAt: true,
          suppressedReason: true,
          createdAt: true,
          updatedAt: true,
          notificationType: {
            select: {
              category: true,
              slug: true,
            },
          },
          _count: {
            select: {
              deliveryAttempts: true,
            },
          },
          deliveryAttempts: {
            orderBy: { attemptedAt: 'desc' },
            take: 1,
            select: {
              status: true,
              errorCode: true,
              attemptedAt: true,
            },
          },
        },
      }),
      this.prisma.notification.count({ where }),
    ]);
  }

  findOperationalNotificationById(
    notificationId: string,
    excludedTypeSlugs?: string[],
    excludedTypePrefixes?: string[],
  ) {
    const exclusionRules: Prisma.NotificationTypeWhereInput[] = [];

    for (const excludedSlug of excludedTypeSlugs ?? []) {
      exclusionRules.push({ slug: excludedSlug });
    }

    for (const excludedPrefix of excludedTypePrefixes ?? []) {
      exclusionRules.push({ slug: { startsWith: excludedPrefix } });
    }

    return this.prisma.notification.findFirst({
      where: {
        id: notificationId,
        notificationType:
          exclusionRules.length > 0
            ? {
                NOT: exclusionRules,
              }
            : undefined,
      },
      select: {
        id: true,
        status: true,
        channel: true,
        userId: true,
        locale: true,
        titleSnapshot: true,
        subjectSnapshot: true,
        bodySnapshot: true,
        relatedEntityType: true,
        relatedEntityId: true,
        scheduledFor: true,
        sentAt: true,
        failedAt: true,
        suppressedReason: true,
        createdAt: true,
        updatedAt: true,
        notificationType: {
          select: {
            category: true,
            slug: true,
          },
        },
        deliveryAttempts: {
          orderBy: { attemptedAt: 'desc' },
          take: 20,
          select: {
            id: true,
            attemptNumber: true,
            status: true,
            provider: true,
            errorCode: true,
            errorMessage: true,
            attemptedAt: true,
          },
        },
      },
    });
  }

  listAdminAuditEvents(input: {
    dateFrom?: Date;
    dateTo?: Date;
    actorRole?: UserRoleType;
    eventFamily?: string;
    category?: NotificationCategory;
    severity?: AdminAuditSeverity;
    source?: AdminAuditSource;
    targetEntityType?: string;
    search?: string;
    page: number;
    limit: number;
  }) {
    const skip = (input.page - 1) * input.limit;
    const statusFilter = this.resolveStatusFilterForAuditSeverity(input.severity);

    const andFilters: Prisma.AuditEventWhereInput[] = [];

    if (input.dateFrom || input.dateTo) {
      andFilters.push({
        occurredAt: {
          gte: input.dateFrom,
          lte: input.dateTo,
        },
      });
    }

    if (input.actorRole) {
      andFilters.push({
        actorUser: {
          roles: {
            some: {
              role: input.actorRole,
            },
          },
        },
      });
    }

    if (input.eventFamily) {
      andFilters.push({
        eventFamily: input.eventFamily.toLowerCase(),
      });
    }

    if (input.category) {
      andFilters.push({
        category: input.category,
      });
    }

    if (input.source) {
      andFilters.push({
        source: this.mapAuditSourceToEntity(input.source),
      });
    }

    if (input.targetEntityType) {
      andFilters.push({
        targetEntityType: input.targetEntityType,
      });
    }

    if (statusFilter.length > 0) {
      andFilters.push({
        status: {
          in: statusFilter,
        },
      });
    }

    if (input.search) {
      const normalizedSearch = input.search.trim();
      const uuidPattern =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      const isUuidSearch = uuidPattern.test(normalizedSearch);

      const searchFilters: Prisma.AuditEventWhereInput[] = [
        { typeSlug: { contains: normalizedSearch, mode: 'insensitive' } },
        { targetEntityType: { contains: normalizedSearch, mode: 'insensitive' } },
        { targetEntityId: { contains: normalizedSearch, mode: 'insensitive' } },
        { titleSnapshot: { contains: normalizedSearch, mode: 'insensitive' } },
        { bodySnapshot: { contains: normalizedSearch, mode: 'insensitive' } },
        { suppressedReason: { contains: normalizedSearch, mode: 'insensitive' } },
        {
          actorUser: {
            displayName: { contains: normalizedSearch, mode: 'insensitive' },
          },
        },
      ];

      if (isUuidSearch) {
        searchFilters.unshift({ actorUserId: normalizedSearch });
      }

      andFilters.push({
        OR: searchFilters,
      });
    }

    const where: Prisma.AuditEventWhereInput =
      andFilters.length > 0 ? { AND: andFilters } : {};

    return this.prisma.$transaction([
      this.prisma.auditEvent.findMany({
        where,
        orderBy: [{ occurredAt: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: input.limit,
        select: {
          id: true,
          typeSlug: true,
          category: true,
          status: true,
          source: true,
          actorUserId: true,
          targetEntityType: true,
          targetEntityId: true,
          titleSnapshot: true,
          subjectSnapshot: true,
          bodySnapshot: true,
          suppressedReason: true,
          occurredAt: true,
          createdAt: true,
          updatedAt: true,
          actorUser: {
            select: {
              displayName: true,
              roles: {
                orderBy: { createdAt: 'asc' },
                select: {
                  role: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.auditEvent.count({ where }),
    ]);
  }

  findAdminAuditEventById(eventId: string) {
    return this.prisma.auditEvent.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        typeSlug: true,
        category: true,
        status: true,
        source: true,
        actorUserId: true,
        targetEntityType: true,
        targetEntityId: true,
        titleSnapshot: true,
        subjectSnapshot: true,
        bodySnapshot: true,
        suppressedReason: true,
        occurredAt: true,
        createdAt: true,
        updatedAt: true,
        actorUser: {
          select: {
            displayName: true,
            roles: {
              orderBy: { createdAt: 'asc' },
              select: {
                role: true,
              },
            },
          },
        },
      },
    });
  }

  private resolveStatusFilterForAuditSeverity(
    severity?: AdminAuditSeverity,
  ): NotificationStatus[] {
    if (!severity) {
      return [];
    }

    if (severity === AdminAuditSeverity.CRITICAL) {
      return [NotificationStatus.FAILED];
    }

    if (severity === AdminAuditSeverity.HIGH) {
      return [NotificationStatus.SUPPRESSED, NotificationStatus.CANCELLED];
    }

    if (severity === AdminAuditSeverity.MEDIUM) {
      return [NotificationStatus.PENDING, NotificationStatus.QUEUED];
    }

    return [NotificationStatus.SENT, NotificationStatus.DELIVERED, NotificationStatus.READ];
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
        locale: true,
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
      where: {
        notificationId: row.id,
      },
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

  private mapAuditSourceToEntity(source: AdminAuditSource): AuditEventSource {
    if (source === AdminAuditSource.IN_APP) return AuditEventSource.IN_APP;
    if (source === AdminAuditSource.EMAIL) return AuditEventSource.EMAIL;
    if (source === AdminAuditSource.SMS) return AuditEventSource.SMS;
    if (source === AdminAuditSource.PUSH) return AuditEventSource.PUSH;
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
