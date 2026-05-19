import { Injectable } from '@nestjs/common';
import {
  AuditEventSource,
  NotificationCategory,
  NotificationChannel,
  NotificationStatus,
  Prisma,
  SecurityAuditOutcome,
  UserRoleType,
} from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import {
  AdminAuditSeverity,
  AdminAuditSource,
} from '../dto/list-admin-audit-events.dto';

type AdminAuditActorSummary = {
  displayName: string | null;
  roles: { role: UserRoleType }[];
};

type AdminAuditTimelineRow = {
  id: string;
  typeSlug: string;
  category: NotificationCategory;
  status: NotificationStatus;
  source: AuditEventSource;
  actorUserId: string | null;
  targetEntityType: string | null;
  targetEntityId: string | null;
  titleSnapshot: string | null;
  subjectSnapshot: string | null;
  bodySnapshot: string | null;
  suppressedReason: string | null;
  occurredAt: Date;
  createdAt: Date;
  updatedAt: Date;
  actorUser: AdminAuditActorSummary | null;
};

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
    const statusFilter = this.resolveStatusFilterForAuditSeverity(
      input.severity,
    );
    const normalizedSearch = input.search?.trim() ?? '';
    const isUuidSearch = this.isUuidSearch(normalizedSearch);

    return this.prisma
      .$transaction([
        this.prisma.auditEvent.findMany({
          where: this.buildAuditEventTimelineWhere(
            input.dateFrom,
            input.dateTo,
          ),
          orderBy: [{ occurredAt: 'desc' }, { createdAt: 'desc' }],
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
          },
        }),
        this.prisma.securityAuditLog.findMany({
          where: this.buildSecurityAuditTimelineWhere(
            input.dateFrom,
            input.dateTo,
          ),
          orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
          select: {
            id: true,
            action: true,
            outcome: true,
            actorUserId: true,
            resourceType: true,
            resourceId: true,
            targetUserId: true,
            reason: true,
            metadataJson: true,
            occurredAt: true,
          },
        }),
      ])
      .then(async ([auditEvents, securityAuditLogs]) => {
        const allActorIds = new Set<string>();

        for (const row of auditEvents) {
          if (row.actorUserId) {
            allActorIds.add(row.actorUserId);
          }
        }

        for (const row of securityAuditLogs) {
          if (row.actorUserId) {
            allActorIds.add(row.actorUserId);
          }
        }

        const actorLookup = await this.loadActorLookup([...allActorIds]);

        const timelineRows: AdminAuditTimelineRow[] = [
          ...auditEvents.map((row) =>
            this.normalizeAuditEventRow(
              row,
              actorLookup.get(row.actorUserId ?? '') ?? null,
            ),
          ),
          ...securityAuditLogs.map((row) =>
            this.normalizeSecurityAuditLogRow(
              row,
              actorLookup.get(row.actorUserId ?? '') ?? null,
            ),
          ),
        ];

        const filteredRows = timelineRows.filter((row) =>
          this.matchesAuditTimelineFilters(row, {
            actorRole: input.actorRole,
            eventFamily: input.eventFamily,
            category: input.category,
            severity: input.severity,
            source: input.source,
            targetEntityType: input.targetEntityType,
            search: normalizedSearch,
            isUuidSearch,
            statusFilter,
          }),
        );

        filteredRows.sort(
          (left, right) =>
            right.occurredAt.getTime() - left.occurredAt.getTime() ||
            right.createdAt.getTime() - left.createdAt.getTime() ||
            right.id.localeCompare(left.id),
        );

        return [
          filteredRows.slice(skip, skip + input.limit),
          filteredRows.length,
        ] as const;
      });
  }

  findAdminAuditEventById(eventId: string) {
    return this.prisma
      .$transaction([
        this.prisma.auditEvent.findUnique({
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
          },
        }),
        this.prisma.securityAuditLog.findUnique({
          where: { id: eventId },
          select: {
            id: true,
            action: true,
            outcome: true,
            actorUserId: true,
            resourceType: true,
            resourceId: true,
            targetUserId: true,
            reason: true,
            metadataJson: true,
            occurredAt: true,
          },
        }),
      ])
      .then(async ([auditEvent, securityAuditLog]) => {
        const actorId =
          auditEvent?.actorUserId ?? securityAuditLog?.actorUserId ?? null;
        const actorLookup = actorId
          ? await this.loadActorLookup([actorId])
          : new Map<string, AdminAuditActorSummary>();

        if (auditEvent) {
          return {
            ...this.normalizeAuditEventRow(
              auditEvent,
              actorLookup.get(auditEvent.actorUserId ?? '') ?? null,
            ),
          };
        }

        if (securityAuditLog) {
          return {
            ...this.normalizeSecurityAuditLogRow(
              securityAuditLog,
              actorLookup.get(securityAuditLog.actorUserId ?? '') ?? null,
            ),
          };
        }

        return null;
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

    return [
      NotificationStatus.SENT,
      NotificationStatus.DELIVERED,
      NotificationStatus.READ,
    ];
  }

  private buildAuditEventTimelineWhere(
    dateFrom?: Date,
    dateTo?: Date,
  ): Prisma.AuditEventWhereInput {
    if (!dateFrom && !dateTo) {
      return {};
    }

    const occurredAt: Prisma.DateTimeFilter = {};
    if (dateFrom) {
      occurredAt.gte = dateFrom;
    }
    if (dateTo) {
      occurredAt.lte = dateTo;
    }

    return {
      occurredAt,
    };
  }

  private buildSecurityAuditTimelineWhere(
    dateFrom?: Date,
    dateTo?: Date,
  ): Prisma.SecurityAuditLogWhereInput {
    if (!dateFrom && !dateTo) {
      return {};
    }

    const occurredAt: Prisma.DateTimeFilter = {};
    if (dateFrom) {
      occurredAt.gte = dateFrom;
    }
    if (dateTo) {
      occurredAt.lte = dateTo;
    }

    return {
      occurredAt,
    };
  }

  private async loadActorLookup(actorIds: string[]) {
    if (actorIds.length === 0) {
      return new Map<string, AdminAuditActorSummary>();
    }

    const actors = await this.prisma.user.findMany({
      where: {
        id: { in: actorIds },
      },
      select: {
        id: true,
        displayName: true,
        roles: {
          orderBy: { createdAt: 'asc' },
          select: {
            role: true,
          },
        },
      },
    });

    return new Map(
      actors.map((actor) => [
        actor.id,
        {
          displayName: actor.displayName,
          roles: actor.roles,
        } satisfies AdminAuditActorSummary,
      ]),
    );
  }

  private normalizeAuditEventRow(
    row: {
      id: string;
      typeSlug: string;
      category: NotificationCategory;
      status: NotificationStatus;
      source: AuditEventSource;
      actorUserId: string | null;
      targetEntityType: string | null;
      targetEntityId: string | null;
      titleSnapshot: string | null;
      subjectSnapshot: string | null;
      bodySnapshot: string | null;
      suppressedReason: string | null;
      occurredAt: Date;
      createdAt: Date;
      updatedAt: Date;
    },
    actorUser: AdminAuditActorSummary | null,
  ): AdminAuditTimelineRow {
    return {
      ...row,
      actorUser,
    };
  }

  private normalizeSecurityAuditLogRow(
    row: {
      id: string;
      action: string;
      outcome: SecurityAuditOutcome;
      actorUserId: string | null;
      resourceType: string | null;
      resourceId: string | null;
      targetUserId: string | null;
      reason: string | null;
      metadataJson: Prisma.JsonValue | null;
      occurredAt: Date;
    },
    actorUser: AdminAuditActorSummary | null,
  ): AdminAuditTimelineRow {
    const targetEntityType =
      row.resourceType ?? (row.targetUserId ? 'User' : null);
    const targetEntityId = row.resourceId ?? row.targetUserId ?? null;
    const metadataSnapshot =
      row.metadataJson === null
        ? null
        : JSON.stringify(row.metadataJson, null, 2);

    return {
      id: row.id,
      typeSlug: row.action,
      category: NotificationCategory.SECURITY,
      status: this.mapSecurityOutcomeToNotificationStatus(row.outcome),
      source: AuditEventSource.SYSTEM,
      actorUserId: row.actorUserId,
      targetEntityType,
      targetEntityId,
      titleSnapshot: row.action,
      subjectSnapshot:
        targetEntityType && targetEntityId
          ? `${targetEntityType}:${targetEntityId}`
          : targetEntityId,
      bodySnapshot:
        metadataSnapshot ??
        (row.reason
          ? JSON.stringify(
              { reason: row.reason, outcome: row.outcome },
              null,
              2,
            )
          : null),
      suppressedReason: row.reason,
      occurredAt: row.occurredAt,
      createdAt: row.occurredAt,
      updatedAt: row.occurredAt,
      actorUser,
    };
  }

  private mapSecurityOutcomeToNotificationStatus(
    outcome: SecurityAuditOutcome,
  ): NotificationStatus {
    if (outcome === SecurityAuditOutcome.SUCCESS) {
      return NotificationStatus.SENT;
    }

    if (outcome === SecurityAuditOutcome.FAILURE) {
      return NotificationStatus.FAILED;
    }

    return NotificationStatus.SUPPRESSED;
  }

  private matchesAuditTimelineFilters(
    row: AdminAuditTimelineRow,
    input: {
      actorRole?: UserRoleType;
      eventFamily?: string;
      category?: NotificationCategory;
      severity?: AdminAuditSeverity;
      source?: AdminAuditSource;
      targetEntityType?: string;
      search: string;
      isUuidSearch: boolean;
      statusFilter: NotificationStatus[];
    },
  ): boolean {
    if (input.actorRole) {
      const hasRole =
        row.actorUser?.roles.some((role) => role.role === input.actorRole) ??
        false;
      if (!hasRole) {
        return false;
      }
    }

    if (input.eventFamily) {
      const eventFamily = this.resolveTimelineEventFamily(row.typeSlug);
      if (eventFamily !== input.eventFamily.toLowerCase()) {
        return false;
      }
    }

    if (input.category && row.category !== input.category) {
      return false;
    }

    if (
      input.source &&
      row.source !== this.mapAuditSourceToEntity(input.source)
    ) {
      return false;
    }

    if (input.targetEntityType) {
      const normalizedTargetType = row.targetEntityType?.toLowerCase() ?? '';
      if (normalizedTargetType !== input.targetEntityType.toLowerCase()) {
        return false;
      }
    }

    if (
      input.statusFilter.length > 0 &&
      !input.statusFilter.includes(row.status)
    ) {
      return false;
    }

    if (
      input.search.length > 0 &&
      !this.matchesAuditSearch(row, input.search, input.isUuidSearch)
    ) {
      return false;
    }

    return true;
  }

  private matchesAuditSearch(
    row: AdminAuditTimelineRow,
    normalizedSearch: string,
    isUuidSearch: boolean,
  ): boolean {
    const haystacks = [
      row.typeSlug,
      row.targetEntityType ?? '',
      row.targetEntityId ?? '',
      row.titleSnapshot ?? '',
      row.subjectSnapshot ?? '',
      row.bodySnapshot ?? '',
      row.suppressedReason ?? '',
      row.actorUser?.displayName ?? '',
      row.actorUser?.roles.map((role) => role.role).join(' ') ?? '',
    ];

    if (isUuidSearch && row.actorUserId === normalizedSearch) {
      return true;
    }

    return haystacks.some((value) =>
      value.toLowerCase().includes(normalizedSearch.toLowerCase()),
    );
  }

  private isUuidSearch(value: string): boolean {
    if (!value) {
      return false;
    }

    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    );
  }

  private resolveTimelineEventFamily(slug: string): string {
    if (slug.startsWith('security.adminUsers.')) {
      return 'admin';
    }

    if (
      slug.startsWith('security.step_up.') ||
      slug.startsWith('security.permission.')
    ) {
      return 'auth';
    }

    return (slug.split('.')[0] ?? 'system').toLowerCase();
  }

  private async upsertAuditEventFromNotification(
    tx: Prisma.TransactionClient,
    notificationId: string,
  ) {
    const txWithAudit = tx as Prisma.TransactionClient & {
      auditEvent?: {
        upsert: (args: Prisma.AuditEventUpsertArgs) => Promise<unknown>;
      };
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
