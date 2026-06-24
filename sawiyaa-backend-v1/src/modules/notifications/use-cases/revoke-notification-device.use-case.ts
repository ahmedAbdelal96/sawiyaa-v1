import { BadRequestException, Injectable } from '@nestjs/common';
import { AuthenticatedUser } from '@common/interfaces/authenticated-user.interface';
import { RevokeNotificationDeviceDto } from '../dto/notification-devices.dto';
import { NotificationDeviceRepository } from '../repositories/notification-device.repository';

@Injectable()
export class RevokeNotificationDeviceUseCase {
  constructor(
    private readonly notificationDeviceRepository: NotificationDeviceRepository,
  ) {}

  async execute(input: {
    authenticatedUser: AuthenticatedUser;
    dto: RevokeNotificationDeviceDto;
  }) {
    if (!input.dto.token?.trim() && !input.dto.deviceId?.trim()) {
      throw new BadRequestException({
        messageKey: 'notifications.errors.deviceSelectorRequired',
        error: 'NOTIFICATION_DEVICE_SELECTOR_REQUIRED',
      });
    }

    const result = await this.notificationDeviceRepository.revokeUserDevices({
      userId: input.authenticatedUser.id,
      token: input.dto.token ?? null,
      deviceId: input.dto.deviceId ?? null,
    });

    return {
      item: {
        revokedCount: result.count,
      },
    };
  }
}
