import { Injectable } from '@nestjs/common';
import { NotificationChannel } from '@prisma/client';
import { ChannelExecutionResult } from './notification-channel-execution.service';
import { NotificationDeviceRepository } from '../repositories/notification-device.repository';

type PushQueuedNotification = {
  id: string;
  userId: string;
  channel: NotificationChannel;
  titleSnapshot: string | null;
  subjectSnapshot: string | null;
  bodySnapshot: string | null;
  payloadJson: unknown;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
  notificationType: {
    slug: string;
    category: string;
  };
};

type ExpoPushTicket = {
  status?: string;
  id?: string;
  message?: string;
  details?: {
    error?: string;
    [key: string]: unknown;
  };
};

type ExpoPushResponse = {
  data?: ExpoPushTicket[];
  errors?: Array<{
    message?: string;
    [key: string]: unknown;
  }>;
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
    const expoDevices = devices.filter((device) => device.provider === 'EXPO');

    if (devices.length === 0 || expoDevices.length === 0) {
      return {
        success: false,
        provider: 'PUSH',
        errorCode:
          devices.length === 0
            ? 'PUSH_DEVICE_NOT_REGISTERED'
            : 'PUSH_DEVICE_PROVIDER_UNSUPPORTED',
        errorMessage:
          devices.length === 0
            ? 'PUSH_DEVICE_NOT_REGISTERED'
            : 'PUSH_DEVICE_PROVIDER_UNSUPPORTED',
      };
    }

    try {
      const requestBatches = this.chunkArray(expoDevices, 100);
      const allTickets: ExpoPushTicket[] = [];

      for (const batch of requestBatches) {
        const messages = batch.map((device) => ({
          to: device.deviceToken,
          title:
            notification.titleSnapshot ??
            notification.subjectSnapshot ??
            'Notification',
          body: notification.bodySnapshot ?? '',
          sound: 'default',
          priority: 'high',
          data: {
            notificationId: notification.id,
            type: notification.notificationType.slug,
            category: notification.notificationType.category,
            relatedEntityType: notification.relatedEntityType,
            relatedEntityId: notification.relatedEntityId,
            routePath:
              typeof payload?.routePath === 'string' ? payload.routePath : null,
            targetRole,
          },
        }));

        const response = await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: {
            accept: 'application/json',
            'content-type': 'application/json',
          },
          body: JSON.stringify(messages),
        });

        if (!response.ok) {
          return {
            success: false,
            provider: 'PUSH',
            errorCode: 'EXPO_PUSH_HTTP_ERROR',
            errorMessage: `EXPO_PUSH_HTTP_ERROR_${response.status}`,
            responsePayload: {
              status: response.status,
              deviceCount: expoDevices.length,
              notificationId: notification.id,
            },
          };
        }

        const rawResponse = (await response.json()) as
          | ExpoPushResponse
          | ExpoPushTicket[];
        const tickets = Array.isArray(rawResponse)
          ? rawResponse
          : Array.isArray(rawResponse.data)
            ? rawResponse.data
            : [];

        if (tickets.length === 0) {
          return {
            success: false,
            provider: 'PUSH',
            errorCode: 'EXPO_PUSH_EMPTY_RESPONSE',
            errorMessage: 'EXPO_PUSH_EMPTY_RESPONSE',
            responsePayload: {
              deviceCount: expoDevices.length,
              notificationId: notification.id,
            },
          };
        }

        allTickets.push(...tickets);
      }

      if (allTickets.length === 0) {
        return {
          success: false,
          provider: 'PUSH',
          errorCode: 'EXPO_PUSH_EMPTY_RESPONSE',
          errorMessage: 'EXPO_PUSH_EMPTY_RESPONSE',
          responsePayload: {
            deviceCount: expoDevices.length,
            notificationId: notification.id,
          },
        };
      }

      const invalidTokens = new Set<string>();
      const ticketRefs: string[] = [];
      let successCount = 0;
      let failureCount = 0;

      allTickets.forEach((ticket, index) => {
        if (ticket.status === 'ok') {
          successCount += 1;
          if (ticket.id) {
            ticketRefs.push(ticket.id);
          }
          return;
        }

        failureCount += 1;
        const expoError =
          ticket.details?.error ?? ticket.message ?? 'EXPO_PUSH_SEND_FAILED';
        if (expoError === 'DeviceNotRegistered') {
          const device = expoDevices[index];
          if (device) {
            invalidTokens.add(device.deviceToken);
          }
        }
      });

      if (invalidTokens.size > 0) {
        await Promise.all(
          [...invalidTokens].map((token) =>
            this.notificationDeviceRepository.revokeUserDevices({
              userId: notification.userId,
              token,
            }),
          ),
        );
      }

      if (successCount === 0) {
        const firstFailure = allTickets.find(
          (ticket) => ticket.status !== 'ok',
        );
        const errorCode =
          firstFailure?.details?.error ??
          firstFailure?.message ??
          'EXPO_PUSH_SEND_FAILED';

        return {
          success: false,
          provider: 'PUSH',
          errorCode,
          errorMessage: errorCode,
          responsePayload: {
            deviceCount: expoDevices.length,
            notificationId: notification.id,
            failureCount,
          },
        };
      }

      return {
        success: true,
        provider: 'EXPO',
        providerMessageRef: ticketRefs[0] ?? undefined,
        responsePayload: {
          deviceCount: expoDevices.length,
          successCount,
          failureCount,
          notificationId: notification.id,
          targetRole,
        },
      };
    } catch (error) {
      return {
        success: false,
        provider: 'PUSH',
        errorCode: 'EXPO_PUSH_REQUEST_FAILED',
        errorMessage:
          error instanceof Error ? error.message : 'EXPO_PUSH_REQUEST_FAILED',
        responsePayload: {
          deviceCount: expoDevices.length,
          notificationId: notification.id,
        },
      };
    }
  }

  private chunkArray<T>(items: T[], size: number): T[][] {
    if (size <= 0) {
      return [items];
    }

    const chunks: T[][] = [];
    for (let index = 0; index < items.length; index += size) {
      chunks.push(items.slice(index, index + size));
    }

    return chunks;
  }
}
