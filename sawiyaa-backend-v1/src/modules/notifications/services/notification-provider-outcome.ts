import { Prisma } from '@prisma/client';

export type NotificationProviderOutcome =
  | 'ACCEPTED'
  | 'FAILED'
  | 'UNKNOWN'
  | 'PARTIAL';

export type NotificationProviderErrorCategory =
  | 'TRANSIENT'
  | 'RATE_LIMITED'
  | 'PERMANENT'
  | 'CONFIGURATION'
  | 'RECIPIENT_INVALID'
  | 'UNKNOWN_OUTCOME';

export type NotificationReconciliationState =
  | 'NOT_REQUIRED'
  | 'NOT_AVAILABLE'
  | 'PENDING'
  | 'ACCEPTED'
  | 'NOT_ACCEPTED'
  | 'PARTIAL';

export type NotificationProviderReference = {
  kind: string;
  value: string;
  deviceId?: string;
  status?: string;
};

export type NotificationProviderExecutionContext = {
  operationKey: string;
  idempotencyKey?: string;
  previousAttempt?: {
    provider: string | null;
    providerMessageRef: string | null;
    requestPayload: Prisma.JsonValue | null;
    responsePayload: Prisma.JsonValue | null;
    status: string;
    attemptNumber: number;
  };
  excludedDeviceIds?: string[];
};

export type NotificationProviderExecutionResult = {
  success: boolean;
  provider: string;
  providerOutcome: NotificationProviderOutcome;
  providerMessageRef?: string;
  providerReferences?: NotificationProviderReference[];
  httpStatus?: number;
  providerRequestId?: string;
  providerRespondedAt?: string;
  reconciliationState?: NotificationReconciliationState;
  errorCategory?: NotificationProviderErrorCategory;
  providerErrorCode?: string;
  retryAfterMs?: number;
  providerSendAttempted?: boolean;
  errorCode?: string;
  errorMessage?: string;
  responsePayload?: Prisma.InputJsonValue;
};

export function isAcceptedProviderOutcome(
  outcome: NotificationProviderOutcome | undefined,
): boolean {
  return outcome === 'ACCEPTED';
}
