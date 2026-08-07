import { Injectable } from '@nestjs/common';
import {
  SessionAttendanceEventType,
  SessionProvider,
  SessionStatus,
} from '@prisma/client';
import {
  DAILY_ATTENDANCE_MAX_FUTURE_SKEW_SECONDS,
  DAILY_ATTENDANCE_MAX_REPLAY_AGE_SECONDS,
} from '../config/daily-attendance-trust.config';
import type {
  DailyAttendanceWebhookParseResult,
  TrustedAttendanceEvidence,
} from '../types/session-attendance.types';

type SessionIdentity = {
  id: string;
  status: SessionStatus;
  provider: SessionProvider;
  scheduledStartAt: Date | null;
  scheduledEndAt: Date | null;
  joinOpenAt: Date | null;
  joinCloseAt: Date | null;
  videoRoomClosedAt: Date | null;
  patient: { user: { id: string; displayName: string | null } };
  practitioner: { user: { id: string; displayName: string | null } };
};

@Injectable()
export class NormalizeDailyAttendanceEvidenceService {
  normalize(input: {
    parsed: DailyAttendanceWebhookParseResult;
    session: SessionIdentity;
    ingestionKey: string;
    receivedAt?: Date;
  }): TrustedAttendanceEvidence {
    const receivedAt =
      input.receivedAt ?? input.parsed.receivedAt ?? new Date();
    const eventType = this.toEventType(input.parsed);
    const participant = this.resolveParticipant(input.parsed, input.session);
    const freshnessReason = this.resolveFreshnessReason(
      input.parsed.occurredAt,
      receivedAt,
    );
    const windowReason =
      eventType === 'JOINED'
        ? this.resolveWindowReason(input.parsed.occurredAt, input.session)
        : null;
    const trustLevel =
      input.parsed.source === 'SIGNED' &&
      Boolean(input.parsed.providerEventRef) &&
      participant.exact &&
      !freshnessReason
        ? 'TRUSTED'
        : input.parsed.source === 'SIGNED'
          ? 'UNTRUSTED'
          : 'UNKNOWN';
    const lifecycleEligible =
      eventType === 'JOINED' &&
      trustLevel === 'TRUSTED' &&
      participant.role !== 'UNKNOWN' &&
      !windowReason &&
      !this.isTerminal(input.session.status) &&
      (input.session.status === SessionStatus.UPCOMING ||
        input.session.status === SessionStatus.READY_TO_JOIN) &&
      !input.session.videoRoomClosedAt;

    return {
      sessionId: input.session.id,
      participantUserId: participant.userId,
      participantRole: participant.role,
      eventType,
      providerEventId: input.parsed.providerEventRef,
      ingestionKey: input.ingestionKey,
      providerOccurredAt: input.parsed.occurredAt,
      receivedAt,
      trustLevel,
      lifecycleEligible,
      rejectionOrWarningReason:
        freshnessReason ??
        windowReason ??
        (!participant.exact ? participant.reason : undefined) ??
        (!input.parsed.providerEventRef
          ? 'PROVIDER_EVENT_ID_MISSING'
          : undefined) ??
        (input.parsed.source !== 'SIGNED' ? 'UNSIGNED_WEBHOOK' : undefined),
    };
  }

  private resolveParticipant(
    parsed: DailyAttendanceWebhookParseResult,
    session: SessionIdentity,
  ) {
    if (parsed.participantUserId === session.patient.user.id) {
      return {
        userId: parsed.participantUserId,
        role: 'PATIENT' as const,
        exact: true,
        reason: undefined,
      };
    }
    if (parsed.participantUserId === session.practitioner.user.id) {
      return {
        userId: parsed.participantUserId,
        role: 'PRACTITIONER' as const,
        exact: true,
        reason: undefined,
      };
    }
    return {
      userId: parsed.participantUserId,
      role: 'UNKNOWN' as const,
      exact: false,
      reason: parsed.participantUserId
        ? 'PARTICIPANT_ID_NOT_BOOKED_FOR_SESSION'
        : 'PARTICIPANT_ID_MISSING',
    };
  }

  private resolveFreshnessReason(occurredAt: Date, receivedAt: Date) {
    const ageSeconds = (receivedAt.getTime() - occurredAt.getTime()) / 1000;
    if (ageSeconds < -DAILY_ATTENDANCE_MAX_FUTURE_SKEW_SECONDS) {
      return 'PROVIDER_EVENT_TOO_FAR_IN_FUTURE';
    }
    if (ageSeconds > DAILY_ATTENDANCE_MAX_REPLAY_AGE_SECONDS) {
      return 'PROVIDER_EVENT_REPLAY_WINDOW_EXPIRED';
    }
    return null;
  }

  private resolveWindowReason(occurredAt: Date, session: SessionIdentity) {
    if (!session.scheduledStartAt || !session.scheduledEndAt) {
      return 'SESSION_RUNTIME_WINDOW_UNAVAILABLE';
    }
    const joinOpenAt = session.joinOpenAt;
    const joinCloseAt = session.joinCloseAt;
    if (!joinOpenAt || !joinCloseAt) {
      return 'SESSION_RUNTIME_WINDOW_UNAVAILABLE';
    }
    if (occurredAt < joinOpenAt) return 'JOINED_BEFORE_RUNTIME_WINDOW';
    if (occurredAt > joinCloseAt) return 'JOINED_AFTER_RUNTIME_WINDOW';
    return null;
  }

  private toEventType(
    parsed: DailyAttendanceWebhookParseResult,
  ): TrustedAttendanceEvidence['eventType'] {
    if (parsed.providerEventType.trim().toLowerCase() === 'meeting.started') {
      return 'MEETING_STARTED';
    }
    if (parsed.providerEventType.trim().toLowerCase() === 'meeting.ended') {
      return 'MEETING_ENDED';
    }
    return parsed.attendanceEventType === SessionAttendanceEventType.LEFT
      ? 'LEFT'
      : 'JOINED';
  }

  private isTerminal(status: SessionStatus) {
    return (
      status === SessionStatus.COMPLETED ||
      status === SessionStatus.CANCELLED ||
      status === SessionStatus.PATIENT_NO_SHOW ||
      status === SessionStatus.PRACTITIONER_NO_SHOW ||
      status === SessionStatus.BOTH_NO_SHOW ||
      status === SessionStatus.EXPIRED
    );
  }
}
