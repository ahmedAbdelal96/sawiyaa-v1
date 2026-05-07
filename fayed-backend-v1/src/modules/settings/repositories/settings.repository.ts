import { Injectable } from '@nestjs/common';
import { ContentLocale, NotificationChannel, Prisma } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';

@Injectable()
export class SettingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findUserPreferences(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        defaultLocale: true,
        timezone: true,
      },
    });
  }

  updateUserPreferences(input: {
    userId: string;
    locale: ContentLocale;
    timezone: string;
  }) {
    return this.prisma.user.update({
      where: { id: input.userId },
      data: {
        defaultLocale: input.locale,
        timezone: input.timezone,
      },
      select: {
        defaultLocale: true,
        timezone: true,
      },
    });
  }

  async listUserNotificationPreferences(userId: string) {
    return this.prisma.notificationPreference.findMany({
      where: { userId },
      select: {
        notificationTypeId: true,
        channel: true,
        isEnabled: true,
        updatedAt: true,
        notificationType: {
          select: {
            slug: true,
          },
        },
      },
      orderBy: [
        { notificationType: { slug: 'asc' } },
        { channel: 'asc' },
        { updatedAt: 'desc' },
      ],
    });
  }

  listAvailableNotificationTypes() {
    return this.prisma.notificationType.findMany({
      select: {
        id: true,
        slug: true,
        defaultEnabled: true,
        supportsEmail: true,
        supportsPush: true,
        supportsInApp: true,
      },
      orderBy: [{ slug: 'asc' }],
    });
  }

  findNotificationTypesBySlugs(slugs: string[]) {
    return this.prisma.notificationType.findMany({
      where: {
        slug: {
          in: slugs,
        },
      },
      select: {
        id: true,
        slug: true,
        defaultEnabled: true,
        supportsEmail: true,
        supportsPush: true,
        supportsInApp: true,
      },
    });
  }

  async upsertUserNotificationPreferences(input: {
    userId: string;
    items: Array<{
      notificationTypeId: string;
      channel: NotificationChannel;
      enabled: boolean;
    }>;
  }) {
    if (input.items.length === 0) {
      return [];
    }

    const operations: Prisma.PrismaPromise<unknown>[] = input.items.map(
      (item) =>
        this.prisma.notificationPreference.upsert({
          where: {
            userId_notificationTypeId_channel: {
              userId: input.userId,
              notificationTypeId: item.notificationTypeId,
              channel: item.channel,
            },
          },
          create: {
            userId: input.userId,
            notificationTypeId: item.notificationTypeId,
            channel: item.channel,
            isEnabled: item.enabled,
          },
          update: {
            isEnabled: item.enabled,
          },
        }),
    );

    return this.prisma.$transaction(operations);
  }
}
