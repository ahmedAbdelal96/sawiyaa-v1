import { Inject, Injectable, BadRequestException } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { SessionAttendanceEventType, SessionProvider } from '@prisma/client';
import { createHmac, timingSafeEqual } from 'crypto';
import videoConfig from '@config/video.config';
import {
  DAILY_ATTENDANCE_MAX_FUTURE_SKEW_SECONDS,
  DAILY_ATTENDANCE_MAX_REPLAY_AGE_SECONDS,
} from '../config/daily-attendance-trust.config';
import { DailyAttendanceWebhookParseResult } from '../types/session-attendance.types';

type DailyWebhookPayload = Record<string, unknown>;

@Injectable()
export class ParseDailyAttendanceWebhookService {
  constructor(
    @Inject(videoConfig.KEY)
    private readonly videoCfg: ConfigType<typeof videoConfig>,
  ) {}

  parse(input: {
    rawBody: Buffer;
    headers: Record<string, string | string[] | undefined>;
  }): DailyAttendanceWebhookParseResult {
    const payload = this.parsePayload(input.rawBody);
    const signatureHeader = this.readHeader(input.headers, 'x-daily-signature');
    const webhookSignatureHeader = this.readHeader(
      input.headers,
      'x-webhook-signature',
    );
    const webhookTimestampHeader = this.readHeader(
      input.headers,
      'x-webhook-timestamp',
    );
    const source = this.resolveSource({
      rawBody: input.rawBody,
      signatureHeader: webhookSignatureHeader ?? signatureHeader,
      timestampHeader: webhookTimestampHeader,
    });

    const providerEventType = this.readProviderEventType(payload);
    const room = this.readRoom(payload);
    const participant = this.readParticipant(payload);
    const occurredAt = this.readOccurredAt(payload);

    return {
      provider: SessionProvider.DAILY,
      providerEventType,
      providerEventRef: this.readProviderEventRef(payload),
      providerRoomName: room.roomName,
      providerRoomUrl: room.roomUrl,
      providerParticipantRef: participant.participantRef,
      participantUserId: participant.participantUserId,
      participantDisplayName: participant.participantDisplayName,
      attendanceEventType: this.mapAttendanceEventType(providerEventType),
      occurredAt,
      receivedAt: new Date(),
      source,
      payload,
    };
  }

  private parsePayload(rawBody: Buffer): DailyWebhookPayload {
    try {
      return JSON.parse(rawBody.toString('utf8')) as DailyWebhookPayload;
    } catch {
      throw new BadRequestException({
        messageKey: 'sessions.errors.invalidAttendanceWebhookPayload',
        error: 'SESSION_ATTENDANCE_INVALID_WEBHOOK_PAYLOAD',
      });
    }
  }

  private resolveSource(input: {
    rawBody: Buffer;
    signatureHeader: string | null;
    timestampHeader?: string | null;
  }): 'SIGNED' | 'UNSIGNED' {
    const webhookSecret = this.videoCfg.daily.webhookSecret?.trim();

    // When a webhook secret is configured it MUST be present and valid.
    // An unsigned request with a configured secret is a rejected request.
    if (webhookSecret) {
      const signature = input.signatureHeader?.trim();

      if (!signature) {
        throw new BadRequestException({
          messageKey: 'sessions.errors.invalidAttendanceWebhookSignature',
          error: 'SESSION_ATTENDANCE_INVALID_WEBHOOK_SIGNATURE',
          messageParams: { reason: 'MISSING_SIGNATURE' },
        });
      }

      const isDailyWebhookSignature = Boolean(input.timestampHeader?.trim());
      const candidate = isDailyWebhookSignature
        ? signature
        : this.extractSignatureCandidate(signature);
      const expected = isDailyWebhookSignature
        ? createHmac('sha256', Buffer.from(webhookSecret, 'base64'))
            .update(
              `${input.timestampHeader!.trim()}.${input.rawBody.toString('utf8')}`,
            )
            .digest('base64')
        : createHmac('sha256', webhookSecret)
            .update(input.rawBody)
            .digest('hex');

      const candidateBuffer = Buffer.from(candidate, 'utf8');
      const expectedBuffer = Buffer.from(expected, 'utf8');
      const isValid =
        candidateBuffer.length === expectedBuffer.length &&
        timingSafeEqual(candidateBuffer, expectedBuffer);

      if (!isValid) {
        throw new BadRequestException({
          messageKey: 'sessions.errors.invalidAttendanceWebhookSignature',
          error: 'SESSION_ATTENDANCE_INVALID_WEBHOOK_SIGNATURE',
          messageParams: { reason: 'INVALID_SIGNATURE' },
        });
      }

      if (isDailyWebhookSignature) {
        this.assertWebhookTimestampFresh(input.timestampHeader!);
      }

      return 'SIGNED';
    }

    // No secret configured — treat as unsigned (dev/preview only)
    return 'UNSIGNED';
  }

  private extractSignatureCandidate(signature: string): string {
    const v1Match = signature.match(/(?:^|,)\s*v1=([a-fA-F0-9]+)/);
    if (v1Match?.[1]) {
      return v1Match[1].toLowerCase();
    }

    const shaMatch = signature.match(/sha256=([a-fA-F0-9]+)/);
    if (shaMatch?.[1]) {
      return shaMatch[1].toLowerCase();
    }

    return signature.toLowerCase();
  }

  private assertWebhookTimestampFresh(timestampHeader: string): void {
    const timestampSeconds = Number(timestampHeader.trim());
    if (!Number.isFinite(timestampSeconds)) {
      throw new BadRequestException({
        messageKey: 'sessions.errors.invalidAttendanceWebhookSignature',
        error: 'SESSION_ATTENDANCE_INVALID_WEBHOOK_TIMESTAMP',
      });
    }

    const ageSeconds = Date.now() / 1000 - timestampSeconds;
    if (ageSeconds < -DAILY_ATTENDANCE_MAX_FUTURE_SKEW_SECONDS) {
      throw new BadRequestException({
        messageKey: 'sessions.errors.invalidAttendanceWebhookSignature',
        error: 'SESSION_ATTENDANCE_WEBHOOK_TIMESTAMP_IN_FUTURE',
      });
    }
    if (ageSeconds > DAILY_ATTENDANCE_MAX_REPLAY_AGE_SECONDS) {
      throw new BadRequestException({
        messageKey: 'sessions.errors.invalidAttendanceWebhookSignature',
        error: 'SESSION_ATTENDANCE_WEBHOOK_TIMESTAMP_STALE',
      });
    }
  }

  private readProviderEventType(payload: DailyWebhookPayload): string {
    const eventTypeCandidates = [
      this.readString(payload.event),
      this.readString(payload.type),
      this.readString(payload.event_type),
      this.readString(payload.name),
      this.readString(
        (payload.data as Record<string, unknown> | undefined)?.event,
      ),
      this.readString(
        (payload.payload as Record<string, unknown> | undefined)?.type,
      ),
    ];

    const eventType = eventTypeCandidates.find(
      (candidate): candidate is string => Boolean(candidate?.trim()),
    );

    if (!eventType) {
      throw new BadRequestException({
        messageKey: 'sessions.errors.invalidAttendanceWebhookPayload',
        error: 'SESSION_ATTENDANCE_INVALID_WEBHOOK_PAYLOAD',
      });
    }

    return eventType.trim();
  }

  private readProviderEventRef(payload: DailyWebhookPayload): string | null {
    return (
      this.readString(payload.id) ??
      this.readString(payload.event_id) ??
      this.readString(payload.webhook_id) ??
      this.readString(
        (payload.payload as Record<string, unknown> | undefined)?.id,
      ) ??
      null
    );
  }

  private readRoom(payload: DailyWebhookPayload): {
    roomName: string | null;
    roomUrl: string | null;
  } {
    const room = (payload.room as Record<string, unknown> | undefined) ?? {};
    const data = (payload.data as Record<string, unknown> | undefined) ?? {};
    const roomFromData =
      (data.room as Record<string, unknown> | undefined) ?? {};
    const providerPayload =
      (payload.payload as Record<string, unknown> | undefined) ?? {};

    const roomName =
      this.readString(room.name) ??
      this.readString(payload.room) ??
      this.readString(payload.room_name) ??
      this.readString(data.room_name) ??
      this.readString(roomFromData.name) ??
      this.readString(providerPayload.room) ??
      this.readRoomNameFromUrl(
        this.readString(room.url) ??
          this.readString(payload.room_url) ??
          this.readString(data.room_url) ??
          this.readString(roomFromData.url),
      );

    const roomUrl =
      this.readString(room.url) ??
      this.readString(payload.room_url) ??
      this.readString(data.room_url) ??
      this.readString(roomFromData.url) ??
      (roomName ? `https://${roomName}.daily.co` : null);

    return {
      roomName: roomName?.trim() ?? null,
      roomUrl: roomUrl?.trim() ?? null,
    };
  }

  private readParticipant(payload: DailyWebhookPayload): {
    participantRef: string | null;
    participantUserId: string | null;
    participantDisplayName: string | null;
  } {
    const data = (payload.data as Record<string, unknown> | undefined) ?? {};
    const providerPayload =
      (payload.payload as Record<string, unknown> | undefined) ?? {};
    const participant =
      (payload.participant as Record<string, unknown> | undefined) ??
      (data.participant as Record<string, unknown> | undefined) ??
      providerPayload;

    return {
      participantRef:
        this.readString(participant.id) ??
        this.readString(participant.session_id) ??
        this.readString(participant.peer_id) ??
        this.readString(participant.participant_id) ??
        null,
      participantUserId:
        this.readString(participant.user_id) ??
        this.readString(participant.userId) ??
        this.readString(data.user_id) ??
        this.readString(providerPayload.user_id) ??
        null,
      participantDisplayName:
        this.readString(participant.user_name) ??
        this.readString(participant.userName) ??
        this.readString(participant.name) ??
        this.readString(providerPayload.user_name) ??
        null,
    };
  }

  private readOccurredAt(payload: DailyWebhookPayload): Date {
    const data = (payload.data as Record<string, unknown> | undefined) ?? {};
    const participantData =
      (data.participant as Record<string, unknown> | undefined) ?? {};
    const providerPayload =
      (payload.payload as Record<string, unknown> | undefined) ?? {};

    const rawCandidate =
      this.readTimestampCandidate(payload.timestamp) ??
      this.readTimestampCandidate(payload.event_ts) ??
      this.readTimestampCandidate(payload.created_at) ??
      this.readTimestampCandidate(data.timestamp) ??
      this.readTimestampCandidate(data.event_ts) ??
      this.readTimestampCandidate(providerPayload.event_ts) ??
      this.readTimestampCandidate(participantData.joined_at) ??
      this.readTimestampCandidate(participantData.left_at) ??
      this.readTimestampCandidate(providerPayload.joined_at) ??
      this.readTimestampCandidate(providerPayload.left_at);

    if (!rawCandidate) {
      throw new BadRequestException({
        messageKey: 'sessions.errors.invalidAttendanceWebhookPayload',
        error: 'SESSION_ATTENDANCE_TIMESTAMP_REQUIRED',
      });
    }

    const numeric = Number(rawCandidate);
    const parsed = Number.isFinite(numeric)
      ? new Date(numeric < 1_000_000_000_000 ? numeric * 1000 : numeric)
      : new Date(rawCandidate);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException({
        messageKey: 'sessions.errors.invalidAttendanceWebhookPayload',
        error: 'SESSION_ATTENDANCE_INVALID_TIMESTAMP',
      });
    }

    return parsed;
  }

  private mapAttendanceEventType(
    providerEventType: string,
  ): SessionAttendanceEventType | null {
    const normalized = providerEventType.trim().toLowerCase();

    if (
      normalized === 'participant.joined' ||
      normalized === 'participant-joined'
    ) {
      return SessionAttendanceEventType.JOINED;
    }

    if (
      normalized === 'participant.left' ||
      normalized === 'participant-left'
    ) {
      return SessionAttendanceEventType.LEFT;
    }

    // meeting.started / meeting.ended are handled in the use case as
    // SessionEvent records (evidence only, no session state change).
    // Return null so the use case can detect and handle them.
    return null;
  }

  private readRoomNameFromUrl(roomUrl: string | null): string | null {
    if (!roomUrl) {
      return null;
    }

    try {
      const parsed = new URL(
        roomUrl.startsWith('http://') || roomUrl.startsWith('https://')
          ? roomUrl
          : `https://${roomUrl}`,
      );
      const host = parsed.hostname.toLowerCase();
      if (!host.endsWith('.daily.co')) {
        return null;
      }
      const roomName = host.replace('.daily.co', '');
      return roomName || null;
    } catch {
      return null;
    }
  }

  private readHeader(
    headers: Record<string, string | string[] | undefined>,
    key: string,
  ): string | null {
    const candidate =
      headers[key] ?? headers[key.toLowerCase()] ?? headers[key.toUpperCase()];

    if (Array.isArray(candidate)) {
      return candidate[0] ?? null;
    }

    return candidate ?? null;
  }

  private readString(value: unknown): string | null {
    return typeof value === 'string' && value.trim() ? value.trim() : null;
  }

  private readTimestampCandidate(value: unknown): number | string | null {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    return this.readString(value);
  }
}
