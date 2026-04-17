import { SessionAttendanceEventType, SessionProvider } from '@prisma/client';

export type AttendanceWebhookSource = 'SIGNED' | 'UNSIGNED';

export type DailyAttendanceWebhookParseResult = {
  provider: SessionProvider;
  providerEventType: string;
  providerEventRef: string | null;
  providerRoomName: string | null;
  providerRoomUrl: string | null;
  providerParticipantRef: string | null;
  participantUserId: string | null;
  participantDisplayName: string | null;
  attendanceEventType: SessionAttendanceEventType | null;
  occurredAt: Date;
  source: AttendanceWebhookSource;
  payload: Record<string, unknown>;
};
