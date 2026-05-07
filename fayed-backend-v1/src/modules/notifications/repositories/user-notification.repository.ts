import { Injectable } from '@nestjs/common';
import {
  NotificationChannel,
  NotificationStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import {
  userNotificationFeedSelect,
  type UserNotificationFeedRow,
} from '../types/user-notifications.types';

@Injectable()
export class UserNotificationRepository {
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

  listMyInAppNotifications(input: {
    userId: string;
    page: number;
    limit: number;
    now?: Date;
  }): Promise<[UserNotificationFeedRow[], boolean]> {
    const skip = (input.page - 1) * input.limit;
    const now = input.now ?? new Date();

    return this.prisma.$transaction(async (tx) => {
      const rows = await tx.notification.findMany({
        where: {
          userId: input.userId,
          channel: NotificationChannel.IN_APP,
          status: {
            in: [
              NotificationStatus.SENT,
              NotificationStatus.DELIVERED,
              NotificationStatus.READ,
            ],
          },
          OR: [
            {
              scheduledFor: null,
            },
            {
              scheduledFor: {
                lte: now,
              },
            },
          ],
          feedStates: {
            none: {
              userId: input.userId,
              OR: [{ isArchived: true }, { isDismissed: true }],
            },
          },
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip,
        take: input.limit + 1,
        select: userNotificationFeedSelect,
      });

      const hasNextPage = rows.length > input.limit;
      return [rows.slice(0, input.limit), hasNextPage];
    });
  }

  countUnreadMyInAppNotifications(input: {
    userId: string;
    now?: Date;
  }): Promise<number> {
    const now = input.now ?? new Date();

    return this.prisma.notification.count({
      where: {
        userId: input.userId,
        channel: NotificationChannel.IN_APP,
        readAt: null,
        status: {
          in: [
            NotificationStatus.SENT,
            NotificationStatus.DELIVERED,
            NotificationStatus.READ,
          ],
        },
        OR: [
          {
            scheduledFor: null,
          },
          {
            scheduledFor: {
              lte: now,
            },
          },
        ],
        feedStates: {
          none: {
            userId: input.userId,
            OR: [{ isArchived: true }, { isDismissed: true }],
          },
        },
      },
    });
  }

  findMyNotificationById(
    userId: string,
    notificationId: string,
  ): Promise<UserNotificationFeedRow | null> {
    return this.prisma.notification.findFirst({
      where: {
        id: notificationId,
        userId,
        channel: NotificationChannel.IN_APP,
      },
      select: userNotificationFeedSelect,
    });
  }

  markMyNotificationRead(input: {
    userId: string;
    notificationId: string;
    now: Date;
  }) {
    return this.prisma.notification.updateMany({
      where: {
        id: input.notificationId,
        userId: input.userId,
        channel: NotificationChannel.IN_APP,
        readAt: null,
        status: {
          in: [
            NotificationStatus.SENT,
            NotificationStatus.DELIVERED,
            NotificationStatus.READ,
          ],
        },
      },
      data: {
        readAt: input.now,
        status: NotificationStatus.READ,
      },
    });
  }

  markAllMyNotificationsRead(input: { userId: string; now: Date }) {
    return this.prisma.notification.updateMany({
      where: {
        userId: input.userId,
        channel: NotificationChannel.IN_APP,
        readAt: null,
        status: {
          in: [
            NotificationStatus.SENT,
            NotificationStatus.DELIVERED,
            NotificationStatus.READ,
          ],
        },
      },
      data: {
        readAt: input.now,
        status: NotificationStatus.READ,
      },
    });
  }

  createNotification(input: {
    userId: string;
    notificationTypeId: string;
    templateId: string | null;
    channel: NotificationChannel;
    status: NotificationStatus;
    locale: string | null;
    titleSnapshot: string | null;
    subjectSnapshot?: string | null;
    bodySnapshot?: string | null;
    payloadJson?: Prisma.InputJsonValue;
    relatedEntityType?: string | null;
    relatedEntityId?: string | null;
    scheduledFor?: Date | null;
    idempotencyKey?: string | null;
    sentAt?: Date | null;
    suppressedReason?: string | null;
  }) {
    return this.inTransaction(async (tx) => {
      if (input.idempotencyKey) {
        const existing = await tx.notification.findFirst({
          where: {
            userId: input.userId,
            notificationTypeId: input.notificationTypeId,
            channel: input.channel,
            OR: [
              {
                idempotencyKey: input.idempotencyKey,
              },
              {
                payloadJson: {
                  path: ['idempotencyKey'],
                  equals: input.idempotencyKey,
                },
              },
            ],
          },
          select: {
            id: true,
          },
        });

        if (existing) {
          return tx.notification.findUnique({
            where: {
              id: existing.id,
            },
            select: userNotificationFeedSelect,
          });
        }
      }

      try {
        const created = await tx.notification.create({
          data: {
            userId: input.userId,
            notificationTypeId: input.notificationTypeId,
            templateId: input.templateId,
            channel: input.channel,
            status: input.status,
            locale: input.locale,
            titleSnapshot: input.titleSnapshot,
            subjectSnapshot: input.subjectSnapshot ?? null,
            bodySnapshot: input.bodySnapshot,
            payloadJson: input.payloadJson ?? Prisma.JsonNull,
            relatedEntityType: input.relatedEntityType ?? null,
            relatedEntityId: input.relatedEntityId ?? null,
            idempotencyKey: input.idempotencyKey ?? null,
            scheduledFor: input.scheduledFor ?? null,
            sentAt: input.sentAt ?? null,
            suppressedReason: input.suppressedReason ?? null,
          },
          select: userNotificationFeedSelect,
        });

        return created;
      } catch (error) {
        if (input.idempotencyKey && this.isIdempotencyConflict(error)) {
          const existing = await tx.notification.findFirst({
            where: {
              userId: input.userId,
              notificationTypeId: input.notificationTypeId,
              channel: input.channel,
              OR: [
                {
                  idempotencyKey: input.idempotencyKey,
                },
                {
                  payloadJson: {
                    path: ['idempotencyKey'],
                    equals: input.idempotencyKey,
                  },
                },
              ],
            },
            select: userNotificationFeedSelect,
          });

          if (existing) {
            return existing;
          }
        }

        throw error;
      }
    });
  }

  createInAppNotification(input: {
    userId: string;
    notificationTypeId: string;
    templateId: string | null;
    locale: string | null;
    titleSnapshot: string;
    bodySnapshot: string;
    payloadJson: Prisma.InputJsonValue;
    relatedEntityType?: string | null;
    relatedEntityId?: string | null;
    scheduledFor?: Date | null;
    idempotencyKey?: string | null;
    isSuppressed?: boolean;
  }) {
    return this.createNotification({
      userId: input.userId,
      notificationTypeId: input.notificationTypeId,
      templateId: input.templateId,
      channel: NotificationChannel.IN_APP,
      status: input.isSuppressed
        ? NotificationStatus.SUPPRESSED
        : input.scheduledFor
          ? NotificationStatus.PENDING
          : NotificationStatus.SENT,
      locale: input.locale,
      titleSnapshot: input.titleSnapshot,
      bodySnapshot: input.bodySnapshot,
      payloadJson: input.payloadJson,
      relatedEntityType: input.relatedEntityType ?? null,
      relatedEntityId: input.relatedEntityId ?? null,
      scheduledFor: input.scheduledFor ?? null,
      idempotencyKey: input.idempotencyKey ?? null,
      sentAt: !input.isSuppressed && !input.scheduledFor ? new Date() : null,
      suppressedReason: input.isSuppressed ? 'USER_PREF_DISABLED' : null,
    });
  }

  createEmailNotification(input: {
    userId: string;
    notificationTypeId: string;
    templateId: string | null;
    locale: string | null;
    subjectSnapshot: string;
    titleSnapshot?: string | null;
    bodySnapshot: string;
    payloadJson: Prisma.InputJsonValue;
    relatedEntityType?: string | null;
    relatedEntityId?: string | null;
    scheduledFor?: Date | null;
    idempotencyKey?: string | null;
    isSuppressed?: boolean;
  }) {
    return this.createNotification({
      userId: input.userId,
      notificationTypeId: input.notificationTypeId,
      templateId: input.templateId,
      channel: NotificationChannel.EMAIL,
      status: input.isSuppressed
        ? NotificationStatus.SUPPRESSED
        : NotificationStatus.PENDING,
      locale: input.locale,
      titleSnapshot: input.titleSnapshot ?? input.subjectSnapshot,
      subjectSnapshot: input.subjectSnapshot,
      bodySnapshot: input.bodySnapshot,
      payloadJson: input.payloadJson,
      relatedEntityType: input.relatedEntityType ?? null,
      relatedEntityId: input.relatedEntityId ?? null,
      scheduledFor: input.scheduledFor ?? new Date(),
      idempotencyKey: input.idempotencyKey ?? null,
      suppressedReason: input.isSuppressed ? 'USER_PREF_DISABLED' : null,
    });
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

  private isIdempotencyConflict(error: unknown): boolean {
    return Boolean(
      error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code?: string }).code === 'P2002',
    );
  }
}
