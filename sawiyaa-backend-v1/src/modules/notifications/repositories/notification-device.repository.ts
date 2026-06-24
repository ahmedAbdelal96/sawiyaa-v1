import { Injectable } from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';

export type StoredNotificationDevice = {
  id: string;
  userId: string;
  role: string | null;
  provider: string | null;
  deviceToken: string;
  platform: string;
  deviceId: string | null;
  appVersion: string | null;
  locale: string | null;
  timezone: string | null;
  isActive: boolean;
  lastSeenAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class NotificationDeviceRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByToken(token: string) {
    return this.prisma.notificationDevice.findUnique({
      where: { deviceToken: token },
    });
  }

  listUserDevices(userId: string) {
    return this.prisma.notificationDevice.findMany({
      where: { userId },
      orderBy: [{ isActive: 'desc' }, { updatedAt: 'desc' }],
    }) as Promise<StoredNotificationDevice[]>;
  }

  listActiveDevicesByUserAndRole(input: { userId: string; role: string }) {
    return this.prisma.notificationDevice.findMany({
      where: {
        userId: input.userId,
        role: input.role as never,
        isActive: true,
        revokedAt: null,
      },
      orderBy: [{ updatedAt: 'desc' }],
    }) as Promise<StoredNotificationDevice[]>;
  }

  async registerOrUpdate(input: {
    userId: string;
    role: string;
    provider: string;
    platform: string;
    token: string;
    deviceId?: string | null;
    appVersion?: string | null;
    locale?: string | null;
    timezone?: string | null;
    enabled: boolean;
  }) {
    const now = new Date();

    return this.prisma.$transaction(async (tx) => {
      if (input.deviceId?.trim()) {
        await tx.notificationDevice.updateMany({
          where: {
            userId: input.userId,
            role: input.role as never,
            platform: input.platform as never,
            deviceId: input.deviceId.trim(),
            deviceToken: { not: input.token },
            isActive: true,
          },
          data: {
            isActive: false,
            revokedAt: now,
          },
        });
      }

      const existing = await tx.notificationDevice.findUnique({
        where: { deviceToken: input.token },
      });

      if (existing) {
        return tx.notificationDevice.update({
          where: { id: existing.id },
          data: {
            userId: input.userId,
            role: input.role as never,
            provider: input.provider as never,
            platform: input.platform as never,
            deviceId: input.deviceId?.trim() ?? null,
            appVersion: input.appVersion?.trim() ?? null,
            locale: input.locale?.trim() ?? null,
            timezone: input.timezone?.trim() ?? null,
            isActive: input.enabled,
            lastSeenAt: now,
            revokedAt: input.enabled ? null : now,
          },
        }) as Promise<StoredNotificationDevice>;
      }

      return tx.notificationDevice.create({
        data: {
          userId: input.userId,
          role: input.role as never,
          provider: input.provider as never,
          platform: input.platform as never,
          deviceToken: input.token,
          deviceId: input.deviceId?.trim() ?? null,
          appVersion: input.appVersion?.trim() ?? null,
          locale: input.locale?.trim() ?? null,
          timezone: input.timezone?.trim() ?? null,
          isActive: input.enabled,
          lastSeenAt: now,
          revokedAt: input.enabled ? null : now,
        },
      }) as Promise<StoredNotificationDevice>;
    });
  }

  revokeUserDevices(input: {
    userId: string;
    token?: string | null;
    deviceId?: string | null;
  }) {
    const now = new Date();
    const andFilters: Array<Record<string, unknown>> = [
      { userId: input.userId },
    ];

    if (input.token?.trim()) {
      andFilters.push({ deviceToken: input.token.trim() });
    }

    if (input.deviceId?.trim()) {
      andFilters.push({ deviceId: input.deviceId.trim() });
    }

    return this.prisma.notificationDevice.updateMany({
      where: {
        AND: andFilters,
        isActive: true,
      },
      data: {
        isActive: false,
        revokedAt: now,
      },
    });
  }
}
