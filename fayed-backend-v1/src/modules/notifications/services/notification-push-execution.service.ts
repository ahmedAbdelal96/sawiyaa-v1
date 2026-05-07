import { Injectable } from '@nestjs/common';
import { NotificationChannel } from '@prisma/client';
import { ChannelExecutionResult } from './notification-channel-execution.service';
import { NotificationDeviceRepository } from '../repositories/notification-device.repository';

type PushQueuedNotification = {
  id: string;
  userId: string;
  channel: NotificationChannel;
  payloadJson: unknown;
};

@Injectable()
export class NotificationPushExecutionService {
  constructor(
    private readonly notificationDeviceRepository: NotificationDeviceRepository,
  ) {}

  async execute(
    notification: PushQueuedNotification,
  ): Promise<ChannelExecutionResult> {
    const payload =
      notification.payloadJson && typeof notification.payloadJson === 'object'
        ? (notification.payloadJson as Record<string, unknown>)
        : null;
    const targetRole =
      typeof payload?.targetRole === 'string' ? payload.targetRole : null;

    if (targetRole !== 'PATIENT' && targetRole !== 'PRACTITIONER') {
      return {
        success: false,
        provider: 'PUSH',
        errorCode: 'PUSH_TARGET_ROLE_MISSING',
        errorMessage: 'PUSH_TARGET_ROLE_MISSING',
      };
    }

    const devices =
      await this.notificationDeviceRepository.listActiveDevicesByUserAndRole({
        userId: notification.userId,
        role: targetRole,
      });

    if (devices.length === 0) {
      return {
        success: false,
        provider: 'PUSH',
        errorCode: 'PUSH_DEVICE_NOT_REGISTERED',
        errorMessage: 'PUSH_DEVICE_NOT_REGISTERED',
      };
    }

    return {
      success: false,
      provider: 'PUSH',
      errorCode: 'PUSH_PROVIDER_NOT_CONFIGURED',
      errorMessage: 'PUSH_PROVIDER_NOT_CONFIGURED',
      responsePayload: {
        targetRole,
        deviceCount: devices.length,
        notificationId: notification.id,
      },
    };
  }
}
