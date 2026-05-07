import { Injectable } from '@nestjs/common';
import { AuthenticatedUser } from '@common/interfaces/authenticated-user.interface';
import { NotificationDeviceRole } from '../dto/notification-devices.dto';
import { NotificationDeviceRepository } from '../repositories/notification-device.repository';

@Injectable()
export class ListMyNotificationDevicesUseCase {
  constructor(
    private readonly notificationDeviceRepository: NotificationDeviceRepository,
  ) {}

  async execute(authenticatedUser: AuthenticatedUser) {
    const items = await this.notificationDeviceRepository.listUserDevices(
      authenticatedUser.id,
    );

    return {
      items: items.map((item) => ({
        id: item.id,
        role: (item.role as NotificationDeviceRole | null) ?? null,
        provider: item.provider ?? null,
        platform: item.platform,
        deviceId: item.deviceId,
        appVersion: item.appVersion,
        locale: item.locale,
        timezone: item.timezone,
        enabled: item.isActive,
        lastSeenAt: item.lastSeenAt?.toISOString() ?? null,
        revokedAt: item.revokedAt?.toISOString() ?? null,
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
      })),
    };
  }
}
