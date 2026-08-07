import { Inject, Injectable } from '@nestjs/common';
import { ConfigType, ConfigService } from '@nestjs/config';
import {
  SessionProvider,
  SessionReconciliationConfidence,
  SessionReconciliationStatus,
} from '@prisma/client';
import videoConfig from '@config/video.config';
import type {
  SessionAttendanceReconciliationProvider,
  SessionAttendanceReconciliationProviderInput,
  SessionAttendanceReconciliationResult,
} from '../types/session-attendance-reconciliation.types';

type DailyMeetingParticipant = {
  user_id?: string;
  participant_id?: string;
  user_name?: string;
  join_time?: number | string;
  duration?: number;
};

type DailyMeeting = {
  id?: string;
  start_time?: number | string;
  duration?: number;
  ongoing?: boolean;
  participants?: DailyMeetingParticipant[];
};

type DailyMeetingsResponse = {
  total_count?: number;
  data?: DailyMeeting[];
};

/** Daily-specific boundary. No raw provider payload leaves this class. */
@Injectable()
export class DailySessionAttendanceReconciliationAdapter implements SessionAttendanceReconciliationProvider {
  constructor(
    @Inject(videoConfig.KEY)
    private readonly videoCfg: ConfigType<typeof videoConfig>,
    private readonly config: ConfigService,
  ) {}

  async reconcileSession(
    input: SessionAttendanceReconciliationProviderInput,
  ): Promise<SessionAttendanceReconciliationResult> {
    const room = encodeURIComponent(input.providerRoomName);
    const baseUrl = this.videoCfg.daily.apiBaseUrl ?? 'https://api.daily.co/v1';
    const timeoutMs = Number(
      this.config.get('DAILY_RECONCILIATION_TIMEOUT_MS') ?? 5000,
    );
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      if (!this.videoCfg.daily.apiKey?.trim())
        return this.unavailable('DAILY_API_KEY_MISSING');
      const roomResponse = await fetch(`${baseUrl}/rooms/${room}`, {
        headers: { Authorization: `Bearer ${this.videoCfg.daily.apiKey}` },
        signal: controller.signal,
      });
      if (roomResponse.status === 404)
        return this.empty(
          'ROOM_NOT_FOUND',
          SessionReconciliationStatus.NOT_FOUND,
        );
      if (!roomResponse.ok)
        return this.unavailable(`DAILY_HTTP_${roomResponse.status}`);

      const response = await fetch(
        `${baseUrl}/meetings?room=${room}&limit=100`,
        {
          headers: { Authorization: `Bearer ${this.videoCfg.daily.apiKey}` },
          signal: controller.signal,
        },
      );
      if (!response.ok)
        return this.unavailable(`DAILY_HTTP_${response.status}`);
      const payload = (await response.json()) as DailyMeetingsResponse;
      return this.normalize(payload, input);
    } catch (error) {
      return this.unavailable(
        error instanceof Error && error.name === 'AbortError'
          ? 'DAILY_TIMEOUT'
          : 'DAILY_REQUEST_FAILED',
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  private normalize(
    payload: DailyMeetingsResponse,
    input: SessionAttendanceReconciliationProviderInput,
  ): SessionAttendanceReconciliationResult {
    const meetings = payload.data ?? [];
    const participants = meetings.flatMap(
      (meeting) => meeting.participants ?? [],
    );
    const resolve = (userId: string) => {
      const rows = participants.filter((item) => item.user_id === userId);
      const intervals = rows
        .map((item) => this.interval(item))
        .filter((value): value is { start: Date; end: Date } => value !== null)
        .sort((a, b) => a.start.getTime() - b.start.getTime());
      const merged = this.mergeIntervals(intervals);
      return {
        identityConfirmed: rows.length > 0,
        joined: rows.length > 0,
        totalPresenceSeconds: merged.reduce(
          (sum, item) =>
            sum +
            Math.max(
              0,
              Math.floor((item.end.getTime() - item.start.getTime()) / 1000),
            ),
          0,
        ),
        firstJoinedAt: merged[0]?.start ?? null,
        lastLeftAt: merged.at(-1)?.end ?? null,
      };
    };
    const patient = resolve(input.patientId);
    const practitioner = resolve(input.practitionerId);
    const unknownParticipantKeys = new Set(
      participants
        .filter(
          (item) =>
            item.user_id !== input.patientId &&
            item.user_id !== input.practitionerId,
        )
        .map(
          (item) =>
            item.user_id ?? item.participant_id ?? item.user_name ?? 'unknown',
        ),
    );
    const complete =
      meetings.length > 0 &&
      meetings.every((meeting) => meeting.ongoing !== true);
    const truncated =
      typeof payload.total_count === 'number' &&
      payload.total_count > meetings.length;
    const latestMeeting = [...meetings].sort(
      (a, b) => this.timestamp(b.start_time) - this.timestamp(a.start_time),
    )[0];
    return {
      status: complete
        ? SessionReconciliationStatus.CONFIRMED
        : SessionReconciliationStatus.PARTIAL,
      provider: SessionProvider.DAILY,
      roomFound: true,
      meetingStarted: meetings.length > 0,
      meetingEnded: complete,
      patient,
      practitioner,
      unknownParticipantCount: unknownParticipantKeys.size,
      providerMeetingId: latestMeeting?.id ?? null,
      reconciledAt: new Date(),
      providerDataObservedUntil: latestMeeting
        ? this.date(
            this.timestamp(latestMeeting.start_time) +
              Math.max(0, Number(latestMeeting.duration) || 0),
          )
        : null,
      confidence:
        complete && unknownParticipantKeys.size === 0 && !truncated
          ? SessionReconciliationConfidence.HIGH
          : SessionReconciliationConfidence.MEDIUM,
      reasonCodes: complete
        ? truncated
          ? ['MEETING_DATA_TRUNCATED']
          : []
        : meetings.length === 0
          ? ['MEETING_NOT_FOUND']
          : ['MEETING_NOT_FINALIZED'],
      attemptNumber: 1,
      requestStatus: 'SUCCEEDED',
      failureCategory: null,
      eligibleForAutomaticFinalization:
        complete && unknownParticipantKeys.size === 0 && !truncated,
    };
  }

  private interval(
    participant: DailyMeetingParticipant,
  ): { start: Date; end: Date } | null {
    const start = this.date(participant.join_time);
    if (!start) return null;
    const durationSeconds = Math.max(0, Number(participant.duration) || 0);
    return {
      start,
      end: new Date(start.getTime() + durationSeconds * 1000),
    };
  }

  private mergeIntervals(
    intervals: Array<{ start: Date; end: Date }>,
  ): Array<{ start: Date; end: Date }> {
    const merged: Array<{ start: Date; end: Date }> = [];
    for (const interval of intervals) {
      const previous = merged.at(-1);
      if (!previous || interval.start.getTime() > previous.end.getTime()) {
        merged.push({ ...interval });
      } else if (interval.end.getTime() > previous.end.getTime()) {
        previous.end = interval.end;
      }
    }
    return merged;
  }

  private empty(
    reason: string,
    status: SessionReconciliationStatus,
  ): SessionAttendanceReconciliationResult {
    return {
      ...this.blank(),
      status,
      roomFound: false,
      confidence: SessionReconciliationConfidence.UNTRUSTED,
      reasonCodes: [reason],
      requestStatus: 'NOT_FOUND',
      failureCategory: reason,
    };
  }

  private unavailable(reason: string): SessionAttendanceReconciliationResult {
    return {
      ...this.blank(),
      status: SessionReconciliationStatus.UNAVAILABLE,
      confidence: SessionReconciliationConfidence.UNTRUSTED,
      reasonCodes: [reason],
      requestStatus: reason === 'DAILY_TIMEOUT' ? 'TIMEOUT' : 'FAILED',
      failureCategory: reason,
    };
  }

  private blank(): SessionAttendanceReconciliationResult {
    const participant = {
      identityConfirmed: false,
      joined: false,
      totalPresenceSeconds: 0,
      firstJoinedAt: null,
      lastLeftAt: null,
    };
    return {
      status: SessionReconciliationStatus.UNAVAILABLE,
      provider: SessionProvider.DAILY,
      roomFound: false,
      meetingStarted: null,
      meetingEnded: null,
      patient: participant,
      practitioner: participant,
      unknownParticipantCount: 0,
      providerMeetingId: null,
      reconciledAt: new Date(),
      providerDataObservedUntil: null,
      confidence: SessionReconciliationConfidence.UNTRUSTED,
      reasonCodes: [],
      attemptNumber: 1,
      requestStatus: 'FAILED',
      failureCategory: null,
      eligibleForAutomaticFinalization: false,
    };
  }

  private timestamp(value?: number | string): number {
    if (value === undefined || value === null || value === '') return NaN;
    const numeric = typeof value === 'number' ? value : Number(value);
    if (Number.isFinite(numeric)) {
      return numeric < 1_000_000_000_000 ? numeric * 1000 : numeric;
    }
    const parsed = new Date(value).getTime();
    return Number.isNaN(parsed) ? NaN : parsed;
  }

  private date(value?: number | string): Date | null {
    const timestamp = this.timestamp(value);
    if (Number.isNaN(timestamp)) return null;
    const parsed = new Date(timestamp);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
}
