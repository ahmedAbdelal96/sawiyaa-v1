import { SessionAttendanceEventType, SessionProvider } from '@prisma/client';

export type AttendanceWebhookSource = 'SIGNED' | 'UNSIGNED';

export type AttendanceEvidenceTrustLevel = 'TRUSTED' | 'UNTRUSTED' | 'UNKNOWN';

export type TrustedAttendanceEvidence = {
  sessionId: string;
  participantUserId: string | null;
  participantRole: 'PATIENT' | 'PRACTITIONER' | 'UNKNOWN';
  eventType: 'JOINED' | 'LEFT' | 'MEETING_STARTED' | 'MEETING_ENDED';
  providerEventId: string | null;
  ingestionKey: string;
  providerOccurredAt: Date;
  receivedAt?: Date;
  trustLevel: AttendanceEvidenceTrustLevel;
  lifecycleEligible: boolean;
  rejectionOrWarningReason?: string;
};

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
  receivedAt: Date;
  source: AttendanceWebhookSource;
  payload: Record<string, unknown>;
};
