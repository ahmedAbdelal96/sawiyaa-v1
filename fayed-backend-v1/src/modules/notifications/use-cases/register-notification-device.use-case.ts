import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { AuthenticatedUser } from '@common/interfaces/authenticated-user.interface';
import { normalizeIanaTimeZoneInput } from '@common/utils/timezone.util';
import {
  NotificationDeviceRole,
  RegisterNotificationDeviceDto,
} from '../dto/notification-devices.dto';
import { NotificationDeviceRepository } from '../repositories/notification-device.repository';

@Injectable()
export class RegisterNotificationDeviceUseCase {
  constructor(
    private readonly notificationDeviceRepository: NotificationDeviceRepository,
  ) {}

  async execute(input: {
    authenticatedUser: AuthenticatedUser;
    dto: RegisterNotificationDeviceDto;
  }) {
    this.assertRoleAllowed(input.authenticatedUser, input.dto.role);
    const timezone = this.normalizeDeviceTimezoneMetadata(input.dto.timezone);

    const item = await this.notificationDeviceRepository.registerOrUpdate({
      userId: input.authenticatedUser.id,
      token: input.dto.token.trim(),
      provider: input.dto.provider,
      platform: input.dto.platform,
      role: input.dto.role,
      deviceId: input.dto.deviceId ?? null,
      appVersion: input.dto.appVersion ?? null,
      locale: input.dto.locale ?? null,
      timezone,
      enabled: input.dto.enabled ?? true,
    });

    return {
      item: {
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
      },
    };
  }

  private assertRoleAllowed(
    authenticatedUser: AuthenticatedUser,
    role: NotificationDeviceRole,
  ) {
    if (!authenticatedUser.roles.includes(role as never)) {
      throw new ForbiddenException({
        messageKey: 'notifications.errors.deviceRoleForbidden',
        error: 'NOTIFICATION_DEVICE_ROLE_FORBIDDEN',
      });
    }

    if (role !== 'PATIENT' && role !== 'PRACTITIONER') {
      throw new BadRequestException({
        messageKey: 'notifications.errors.invalidDeviceRole',
        error: 'NOTIFICATION_DEVICE_ROLE_INVALID',
      });
    }
  }

  private normalizeDeviceTimezoneMetadata(
    timezone?: string | null,
  ): string | null {
    try {
      const normalized = normalizeIanaTimeZoneInput(timezone, {
        messageKey: 'notifications.errors.invalidDeviceTimezone',
        error: 'NOTIFICATION_DEVICE_INVALID_TIMEZONE',
      });

      return typeof normalized === 'string' ? normalized : null;
    } catch {
      return null;
    }
  }
}
