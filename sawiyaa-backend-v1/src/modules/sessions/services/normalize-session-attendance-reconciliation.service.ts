import { Injectable } from '@nestjs/common';
import { SessionProvider, SessionReconciliationStatus } from '@prisma/client';
import type { SessionAttendanceReconciliationResult } from '../types/session-attendance-reconciliation.types';

/** Normalizes already provider-specific data; raw Daily payloads stop at the adapter. */
@Injectable()
export class NormalizeSessionAttendanceReconciliationService {
  normalize(
    input: SessionAttendanceReconciliationResult,
  ): SessionAttendanceReconciliationResult {
    const participant = (
      value: SessionAttendanceReconciliationResult['patient'],
    ) => ({
      identityConfirmed: value.identityConfirmed === true,
      joined: value.joined === true,
      totalPresenceSeconds: Math.max(
        0,
        Math.floor(value.totalPresenceSeconds || 0),
      ),
      firstJoinedAt: value.firstJoinedAt ? new Date(value.firstJoinedAt) : null,
      lastLeftAt: value.lastLeftAt ? new Date(value.lastLeftAt) : null,
    });
    return {
      ...input,
      provider: input.provider ?? SessionProvider.DAILY,
      status: input.status ?? SessionReconciliationStatus.UNAVAILABLE,
      roomFound: input.roomFound === true,
      patient: participant(input.patient),
      practitioner: participant(input.practitioner),
      unknownParticipantCount: Math.max(
        0,
        Math.floor(input.unknownParticipantCount || 0),
      ),
      reasonCodes: Array.from(new Set(input.reasonCodes ?? [])),
      reconciledAt: new Date(input.reconciledAt),
      providerDataObservedUntil: input.providerDataObservedUntil
        ? new Date(input.providerDataObservedUntil)
        : null,
      attemptNumber: Math.max(1, Math.floor(input.attemptNumber || 1)),
      eligibleForAutomaticFinalization:
        input.eligibleForAutomaticFinalization === true,
    };
  }
}
