import type {
  SessionProvider,
  SessionReconciliationConfidence,
  SessionReconciliationStatus,
} from '@prisma/client';

export type ReconciledParticipant = {
  identityConfirmed: boolean;
  joined: boolean;
  totalPresenceSeconds: number;
  firstJoinedAt: Date | null;
  lastLeftAt: Date | null;
};

export type SessionAttendanceReconciliationResult = {
  status: SessionReconciliationStatus;
  provider: SessionProvider;
  roomFound: boolean;
  meetingStarted: boolean | null;
  meetingEnded: boolean | null;
  patient: ReconciledParticipant;
  practitioner: ReconciledParticipant;
  unknownParticipantCount: number;
  providerMeetingId: string | null;
  reconciledAt: Date;
  providerDataObservedUntil: Date | null;
  confidence: SessionReconciliationConfidence;
  reasonCodes: string[];
  attemptNumber: number;
  requestStatus: 'SUCCEEDED' | 'FAILED' | 'TIMEOUT' | 'NOT_FOUND';
  failureCategory: string | null;
  eligibleForAutomaticFinalization: boolean;
};

export type SessionAttendanceReconciliationProviderInput = {
  sessionId: string;
  providerRoomName: string;
  scheduledStartAt: Date;
  scheduledEndAt: Date;
  patientId: string;
  practitionerId: string;
};

export interface SessionAttendanceReconciliationProvider {
  reconcileSession(
    input: SessionAttendanceReconciliationProviderInput,
  ): Promise<SessionAttendanceReconciliationResult>;
}
