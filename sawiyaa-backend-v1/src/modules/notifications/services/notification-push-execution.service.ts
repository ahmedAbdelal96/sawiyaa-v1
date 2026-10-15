import { Injectable, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationChannel } from '@prisma/client';
import { createHash } from 'node:crypto';
import { ChannelExecutionResult } from './notification-channel-execution.service';
import { NotificationDeviceRepository } from '../repositories/notification-device.repository';
import {
  NotificationProviderExecutionContext,
  NotificationProviderReference,
} from './notification-provider-outcome';
import {
  classifyProviderHttpStatus,
  parseRetryAfterMs,
} from './notification-provider-error';
import {
  isProviderCapacityAdmissionError,
  ProviderCapacityAdmissionError,
  ProviderCapacityService,
} from './provider-capacity.service';

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
  notificationType: { slug: string; category: string };
};

type ExpoPushTicket = {
  status?: string;
  id?: string;
  message?: string;
  details?: { error?: string; [key: string]: unknown };
};

type ExpoPushResponse = {
  data?: ExpoPushTicket[];
  errors?: Array<{ message?: string; [key: string]: unknown }>;
};

type ExpoReference = NotificationProviderReference & {
  kind: 'EXPO_TICKET';
  deviceId: string;
  ticketId: string;
  status: string;
};

type PushAttemptMetadata = {
  providerOutcome?: string;
  providerReferences?: Array<Partial<ExpoReference>>;
  acceptedDeviceIds?: string[];
};

@Injectable()
export class NotificationPushExecutionService {
  private readonly totalDeadlineMs = 20_000;

  constructor(
    private readonly notificationDeviceRepository: NotificationDeviceRepository,
    @Optional() private readonly configService?: ConfigService,
    @Optional() private readonly capacity?: ProviderCapacityService,
  ) {}

  async execute(
    notification: PushQueuedNotification,
    context?: NotificationProviderExecutionContext,
  ): Promise<ChannelExecutionResult> {
    const payload =
      notification.payloadJson && typeof notification.payloadJson === 'object'
        ? (notification.payloadJson as Record<string, unknown>)
        : null;
    const targetRole =
      typeof payload?.targetRole === 'string' ? payload.targetRole : null;

    if (targetRole !== 'PATIENT' && targetRole !== 'PRACTITIONER') {
      return this.failed(
        'PUSH_TARGET_ROLE_MISSING',
        'PUSH_TARGET_ROLE_MISSING',
      );
    }

    const devices =
      await this.notificationDeviceRepository.listActiveDevicesByUserAndRole({
        userId: notification.userId,
        role: targetRole,
      });
    const expoDevices = devices.filter((device) => device.provider === 'EXPO');

    if (devices.length === 0 || expoDevices.length === 0) {
      return this.failed(
        devices.length === 0
          ? 'PUSH_DEVICE_NOT_REGISTERED'
          : 'PUSH_DEVICE_PROVIDER_UNSUPPORTED',
        devices.length === 0
          ? 'PUSH_DEVICE_NOT_REGISTERED'
          : 'PUSH_DEVICE_PROVIDER_UNSUPPORTED',
      );
    }

    const previous = this.readPreviousMetadata(context);
    const acceptedFromPrevious = new Set(
      previous?.acceptedDeviceIds ?? context?.excludedDeviceIds ?? [],
    );
    const excludedFromPrevious = new Set(acceptedFromPrevious);

    if (
      context?.previousAttempt?.responsePayload &&
      previous?.providerOutcome === 'UNKNOWN'
    ) {
      let reconciliation: Awaited<
        ReturnType<NotificationPushExecutionService['reconcileTickets']>
      >;
      try {
        reconciliation = await this.reconcileTickets(
          notification.userId,
          previous.providerReferences ?? [],
        );
      } catch (error) {
        if (isProviderCapacityAdmissionError(error)) {
          return this.capacityDeferredResult(error, notification.id, [
            ...acceptedFromPrevious,
          ]);
        }
        throw error;
      }
      for (const deviceId of reconciliation.acceptedDeviceIds) {
        acceptedFromPrevious.add(deviceId);
        excludedFromPrevious.add(deviceId);
      }
      for (const deviceId of reconciliation.excludedDeviceIds) {
        excludedFromPrevious.add(deviceId);
      }
      if (reconciliation.unknownDeviceIds.length > 0) {
        return this.unknownResult({
          notificationId: notification.id,
          providerReferences: reconciliation.references,
          acceptedDeviceIds: [...acceptedFromPrevious],
          unresolvedDeviceIds: reconciliation.unknownDeviceIds,
          reason: 'EXPO_RECEIPT_NOT_AVAILABLE',
          providerSendAttempted: false,
        });
      }
    }

    const remainingDevices = expoDevices.filter(
      (device) => !excludedFromPrevious.has(this.safeDeviceId(device)),
    );
    if (remainingDevices.length === 0) {
      const terminalFailureCount = Math.max(
        0,
        excludedFromPrevious.size - acceptedFromPrevious.size,
      );
      if (terminalFailureCount > 0) {
        return {
          success: false,
          provider: 'EXPO',
          providerOutcome: 'PARTIAL',
          reconciliationState: 'PARTIAL',
          errorCode: 'DELIVERY_FAILED',
          errorMessage: 'EXPO_PUSH_PARTIAL_RESULT',
          errorCategory: 'RECIPIENT_INVALID',
          providerSendAttempted: false,
          responsePayload: {
            deviceCount: expoDevices.length,
            successCount: acceptedFromPrevious.size,
            failureCount: terminalFailureCount,
            notificationId: notification.id,
            targetRole,
            acceptedDeviceIds: [...acceptedFromPrevious],
            excludedDeviceIds: [...excludedFromPrevious],
          },
        };
      }
      return {
        success: true,
        provider: 'EXPO',
        providerOutcome: 'ACCEPTED',
        reconciliationState: 'ACCEPTED',
        responsePayload: {
          deviceCount: expoDevices.length,
          successCount: acceptedFromPrevious.size,
          failureCount: 0,
          notificationId: notification.id,
          targetRole,
          acceptedDeviceIds: [...acceptedFromPrevious],
          excludedDeviceIds: [...excludedFromPrevious],
        },
      };
    }

    const deadline = Date.now() + this.totalDeadlineMs;
    const allTicketResults: Array<{
      ticket: ExpoPushTicket;
      device: (typeof remainingDevices)[number];
    }> = [];

    try {
      for (const batch of this.chunkArray(remainingDevices, 100)) {
        const response = await this.fetchWithDeadline(
          'https://exp.host/--/api/v2/push/send',
          {
            method: 'POST',
            headers: {
              accept: 'application/json',
              'content-type': 'application/json',
            },
            body: JSON.stringify(
              batch.map((device) => ({
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
                  relatedEntityType: notification.relatedEntityType,
                  relatedEntityId: notification.relatedEntityId,
                  ...(typeof payload?.sessionId === 'string'
                    ? { sessionId: payload.sessionId }
                    : {}),
                  ...(typeof payload?.sessionCode === 'string'
                    ? { sessionCode: payload.sessionCode }
                    : {}),
                  routePath:
                    typeof payload?.routePath === 'string'
                      ? payload.routePath
                      : null,
                  targetRole,
                },
              })),
            ),
          },
          deadline,
          batch.length,
        );

        if (!response.ok) {
          return {
            success: false,
            provider: 'EXPO',
            providerOutcome: 'FAILED',
            reconciliationState: 'NOT_REQUIRED',
            errorCode: `EXPO_PUSH_HTTP_ERROR_${response.status}`,
            errorMessage: `EXPO_PUSH_HTTP_ERROR_${response.status}`,
            errorCategory: classifyProviderHttpStatus(response.status),
            providerErrorCode: `HTTP_${response.status}`,
            retryAfterMs: parseRetryAfterMs(
              response.headers?.get('retry-after'),
            ),
            providerSendAttempted: true,
            responsePayload: {
              notificationId: notification.id,
              acceptedDeviceIds: [...acceptedFromPrevious],
              httpStatus: response.status,
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
          return this.unknownResult({
            notificationId: notification.id,
            acceptedDeviceIds: [...acceptedFromPrevious],
            reason: 'EXPO_PUSH_EMPTY_RESPONSE',
          });
        }
        tickets.forEach((ticket, index) => {
          const device = batch[index];
          if (device) allTicketResults.push({ ticket, device });
        });
      }
    } catch (error) {
      if (isProviderCapacityAdmissionError(error)) {
        return this.capacityDeferredResult(error, notification.id, [
          ...acceptedFromPrevious,
        ]);
      }
      return this.unknownResult({
        notificationId: notification.id,
        acceptedDeviceIds: [...acceptedFromPrevious],
        reason:
          error instanceof Error ? error.message : 'EXPO_PUSH_REQUEST_FAILED',
      });
    }

    const invalidTokens = new Set<string>();
    const references: ExpoReference[] = [];
    const acceptedDeviceIds = new Set(acceptedFromPrevious);
    const failedDeviceIds: string[] = [];
    let successCount = 0;
    let failureCount = 0;
    const failureCategories = new Set<
      'TRANSIENT' | 'RATE_LIMITED' | 'PERMANENT' | 'RECIPIENT_INVALID'
    >();
    let firstProviderErrorCode: string | undefined;

    for (const { ticket, device } of allTicketResults) {
      const deviceId = this.safeDeviceId(device);
      if (ticket.status === 'ok') {
        successCount += 1;
        acceptedDeviceIds.add(deviceId);
        if (ticket.id) {
          references.push({
            kind: 'EXPO_TICKET',
            value: ticket.id,
            deviceId,
            ticketId: ticket.id,
            status: 'ok',
          });
        }
        continue;
      }

      failureCount += 1;
      failedDeviceIds.push(deviceId);
      const expoError =
        ticket.details?.error ?? ticket.message ?? 'EXPO_PUSH_SEND_FAILED';
      const category = this.classifyExpoTicketError(expoError);
      failureCategories.add(category);
      firstProviderErrorCode ??= expoError;
      if (expoError === 'DeviceNotRegistered') {
        invalidTokens.add(device.deviceToken);
      }
    }

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

    const responsePayload = {
      deviceCount: expoDevices.length,
      successCount,
      failureCount,
      notificationId: notification.id,
      targetRole,
      acceptedDeviceIds: [...acceptedDeviceIds],
      failedDeviceIds,
      providerReferences: references,
    };

    if (successCount === 0) {
      const firstFailure = allTicketResults.find(
        ({ ticket }) => ticket.status !== 'ok',
      );
      const errorCode =
        firstFailure?.ticket.details?.error ??
        firstFailure?.ticket.message ??
        'EXPO_PUSH_SEND_FAILED';
      return {
        success: false,
        provider: 'EXPO',
        providerOutcome: 'FAILED',
        reconciliationState: 'NOT_REQUIRED',
        errorCode,
        errorMessage: errorCode,
        errorCategory: this.resolveFailureCategory(failureCategories),
        providerErrorCode: errorCode,
        providerSendAttempted: true,
        responsePayload,
      };
    }

    if (failureCount > 0) {
      return {
        success: false,
        provider: 'EXPO',
        providerOutcome: 'PARTIAL',
        reconciliationState: 'PARTIAL',
        providerMessageRef: references[0]?.ticketId,
        providerReferences: references,
        responsePayload,
        errorCode: 'DELIVERY_FAILED',
        errorMessage: 'EXPO_PUSH_PARTIAL_RESULT',
        errorCategory: this.resolveFailureCategory(failureCategories),
        providerErrorCode: firstProviderErrorCode,
        providerSendAttempted: true,
      };
    }

    return {
      success: true,
      provider: 'EXPO',
      providerOutcome: 'ACCEPTED',
      reconciliationState: 'ACCEPTED',
      providerMessageRef: references[0]?.ticketId,
      providerReferences: references,
      providerSendAttempted: true,
      responsePayload,
    };
  }

  private async reconcileTickets(
    userId: string,
    references: Array<Partial<ExpoReference>>,
  ): Promise<{
    acceptedDeviceIds: string[];
    excludedDeviceIds: string[];
    unknownDeviceIds: string[];
    references: ExpoReference[];
  }> {
    const ticketRefs = references.filter(
      (reference): reference is ExpoReference =>
        reference.kind === 'EXPO_TICKET' &&
        typeof reference.ticketId === 'string' &&
        typeof reference.deviceId === 'string',
    );
    if (ticketRefs.length === 0) {
      return {
        acceptedDeviceIds: [],
        excludedDeviceIds: [],
        unknownDeviceIds: [],
        references: [],
      };
    }

    const deadline = Date.now() + this.totalDeadlineMs;
    const acceptedDeviceIds: string[] = [];
    const excludedDeviceIds: string[] = [];
    const unknownDeviceIds: string[] = [];
    const reconciledReferences: ExpoReference[] = [];

    for (const batch of this.chunkArray(ticketRefs, 1_000)) {
      try {
        const response = await this.fetchWithDeadline(
          'https://exp.host/--/api/v2/push/getReceipts',
          {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              ids: batch.map((reference) => reference.ticketId),
            }),
          },
          deadline,
          batch.length,
        );
        if (!response.ok) {
          unknownDeviceIds.push(
            ...batch.map((reference) => reference.deviceId),
          );
          continue;
        }
        const raw = (await response.json()) as {
          data?: Record<
            string,
            { status?: string; details?: { error?: string } }
          >;
        };
        for (const reference of batch) {
          const receipt = raw.data?.[reference.ticketId];
          if (!receipt) {
            unknownDeviceIds.push(reference.deviceId);
            continue;
          }
          if (receipt.status === 'ok') {
            acceptedDeviceIds.push(reference.deviceId);
            reconciledReferences.push({ ...reference, status: 'receipt_ok' });
            continue;
          }
          if (receipt.details?.error === 'DeviceNotRegistered') {
            await this.notificationDeviceRepository.revokeUserDevices({
              userId,
              deviceId: reference.deviceId,
            });
            reconciledReferences.push({
              ...reference,
              status: 'receipt_device_not_registered',
            });
            excludedDeviceIds.push(reference.deviceId);
            continue;
          }
          unknownDeviceIds.push(reference.deviceId);
        }
      } catch (error) {
        if (isProviderCapacityAdmissionError(error)) throw error;
        unknownDeviceIds.push(...batch.map((reference) => reference.deviceId));
      }
    }
    return {
      acceptedDeviceIds,
      excludedDeviceIds,
      unknownDeviceIds,
      references: reconciledReferences,
    };
  }

  private readPreviousMetadata(
    context?: NotificationProviderExecutionContext,
  ): PushAttemptMetadata | null {
    const payload = context?.previousAttempt?.responsePayload;
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return null;
    }
    const value = payload as Record<string, unknown>;
    return {
      providerOutcome:
        typeof value.providerOutcome === 'string'
          ? value.providerOutcome
          : undefined,
      providerReferences: Array.isArray(value.providerReferences)
        ? (value.providerReferences as Array<Partial<ExpoReference>>)
        : undefined,
      acceptedDeviceIds: Array.isArray(value.acceptedDeviceIds)
        ? value.acceptedDeviceIds.filter(
            (id): id is string => typeof id === 'string',
          )
        : undefined,
    };
  }

  private unknownResult(input: {
    notificationId: string;
    providerReferences?: NotificationProviderReference[];
    acceptedDeviceIds?: string[];
    unresolvedDeviceIds?: string[];
    reason: string;
    providerSendAttempted?: boolean;
  }): ChannelExecutionResult {
    return {
      success: false,
      provider: 'EXPO',
      providerOutcome: 'UNKNOWN',
      reconciliationState: 'PENDING',
      errorCode: 'EXPO_PUSH_OUTCOME_UNKNOWN',
      errorMessage: input.reason,
      errorCategory: 'UNKNOWN_OUTCOME',
      providerSendAttempted: input.providerSendAttempted ?? true,
      providerReferences: input.providerReferences,
      responsePayload: {
        notificationId: input.notificationId,
        providerOutcome: 'UNKNOWN',
        providerReferences: input.providerReferences ?? [],
        acceptedDeviceIds: input.acceptedDeviceIds ?? [],
        unresolvedDeviceIds: input.unresolvedDeviceIds ?? [],
        reason: input.reason,
      },
    };
  }

  private capacityDeferredResult(
    error: ProviderCapacityAdmissionError,
    notificationId: string,
    acceptedDeviceIds: string[] = [],
  ): ChannelExecutionResult {
    return {
      success: false,
      provider: 'EXPO',
      providerOutcome: 'FAILED',
      reconciliationState: 'NOT_REQUIRED',
      errorCode: error.code,
      errorMessage: error.reason,
      errorCategory: 'TRANSIENT',
      providerErrorCode: error.code,
      retryAfterMs: error.retryAfterMs || undefined,
      providerSendAttempted: false,
      responsePayload: {
        notificationId,
        providerOutcome: 'FAILED',
        capacityReason: error.reason,
        providerSendAttempted: false,
        acceptedDeviceIds,
      },
    };
  }

  private failed(code: string, message: string): ChannelExecutionResult {
    return {
      success: false,
      provider: 'EXPO',
      providerOutcome: 'FAILED',
      reconciliationState: 'NOT_REQUIRED',
      errorCode: code,
      errorMessage: message,
      errorCategory: code.includes('NOT_REGISTERED')
        ? 'RECIPIENT_INVALID'
        : code.includes('UNSUPPORTED') || code.includes('TARGET_ROLE')
          ? 'CONFIGURATION'
          : 'PERMANENT',
      providerErrorCode: code,
      providerSendAttempted: false,
    };
  }

  private classifyExpoTicketError(
    error: string,
  ): 'TRANSIENT' | 'RATE_LIMITED' | 'PERMANENT' | 'RECIPIENT_INVALID' {
    const normalized = error.toUpperCase();
    if (normalized.includes('RATELIMIT') || normalized.includes('RATE_LIMIT')) {
      return 'RATE_LIMITED';
    }
    if (normalized === 'DEVICENOTREGISTERED') return 'RECIPIENT_INVALID';
    if (
      normalized.includes('MESSAGE_TOO_BIG') ||
      normalized.includes('INVALID') ||
      normalized.includes('MISMATCH')
    ) {
      return 'PERMANENT';
    }
    return 'TRANSIENT';
  }

  private resolveFailureCategory(
    categories: Set<
      'TRANSIENT' | 'RATE_LIMITED' | 'PERMANENT' | 'RECIPIENT_INVALID'
    >,
  ): 'TRANSIENT' | 'RATE_LIMITED' | 'PERMANENT' | 'RECIPIENT_INVALID' {
    if (categories.has('RATE_LIMITED')) return 'RATE_LIMITED';
    if (categories.has('TRANSIENT')) return 'TRANSIENT';
    if (categories.has('RECIPIENT_INVALID')) return 'RECIPIENT_INVALID';
    return 'PERMANENT';
  }

  private async fetchWithDeadline(
    url: string,
    init: RequestInit,
    deadline: number,
    capacityUnits = 1,
  ): Promise<Response> {
    const operation = async () => {
      // Start the provider request timeout only after the local capacity lane
      // admits this operation. Capacity wait is measured separately and must
      // not consume the provider request deadline.
      const remaining = Math.min(
        this.requestTimeoutMs(),
        Math.max(1, deadline - Date.now()),
      );
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), remaining);
      try {
        const response = await fetch(url, {
          ...init,
          signal: controller.signal,
        });
        this.capacity?.recordProviderResponse(
          'EXPO',
          response.status,
          parseRetryAfterMs(response.headers?.get('retry-after')),
        );
        return response;
      } finally {
        clearTimeout(timer);
      }
    };

    return this.capacity
      ? this.capacity.execute('EXPO', operation, { units: capacityUnits })
      : operation();
  }

  private requestTimeoutMs(): number {
    const configured = this.configService?.get<number>(
      'notificationQueue.providerRequestTimeoutMs',
    );
    return typeof configured === 'number' && Number.isFinite(configured)
      ? Math.min(30_000, Math.max(1_000, Math.floor(configured)))
      : 10_000;
  }

  private safeDeviceId(device: {
    id?: string;
    deviceId?: string | null;
    deviceToken: string;
  }): string {
    if (device.id) return device.id;
    if (device.deviceId) return device.deviceId;
    return createHash('sha256')
      .update(device.deviceToken)
      .digest('hex')
      .slice(0, 24);
  }

  private chunkArray<T>(items: T[], size: number): T[][] {
    if (size <= 0) return [items];
    const chunks: T[][] = [];
    for (let index = 0; index < items.length; index += size) {
      chunks.push(items.slice(index, index + size));
    }
    return chunks;
  }
}
