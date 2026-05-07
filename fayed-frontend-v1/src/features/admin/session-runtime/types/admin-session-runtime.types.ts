export type AdminSessionStatus =
  | "DRAFT"
  | "PENDING_PAYMENT"
  | "PENDING_PRACTITIONER_RESPONSE"
  | "CONFIRMED"
  | "UPCOMING"
  | "READY_TO_JOIN"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED"
  | "NO_SHOW"
  | "EXPIRED"
  | "REFUND_PENDING"
  | "REFUNDED";

export type AdminSessionMode = "VIDEO" | "AUDIO" | "CHAT";

export type AdminSessionProvider = string;

export type AdminSessionJoinBlockedReason =
  | "SESSION_NOT_JOINABLE_STATUS"
  | "SESSION_NOT_VIDEO_MODE"
  | "SESSION_TIME_WINDOW_NOT_OPEN"
  | "SESSION_RUNTIME_NOT_PREPARED";

export type AdminSessionRuntimeInspectionItem = {
  id: string;
  sessionCode: string;
  status: AdminSessionStatus;
  sessionMode: AdminSessionMode;
  scheduledStartAt: string | null;
  scheduledEndAt: string | null;
  provider: AdminSessionProvider;
  providerRoomId: string | null;
  providerSessionRef: string | null;
  canPrepareRuntime: boolean;
  canJoin: boolean;
  blockedReason: AdminSessionJoinBlockedReason | null;
};

export type AdminSessionRuntimeInspectionResponseData = {
  item: AdminSessionRuntimeInspectionItem;
};

export type AdminSessionAttendanceEventType = "JOINED" | "LEFT";

export type AdminSessionAttendanceParticipantRole =
  | "PATIENT"
  | "PRACTITIONER"
  | "UNKNOWN";

export type AdminSessionAttendanceTimelineItem = {
  id: string;
  sessionId: string;
  attendanceEventType: AdminSessionAttendanceEventType;
  participantRole: AdminSessionAttendanceParticipantRole;
  participant: {
    userId: string | null;
  };
  provider: AdminSessionProvider;
  providerEventType: string;
  providerEventRef: string | null;
  providerRoomRef: string | null;
  providerParticipantRef: string | null;
  occurredAt: string;
  ingestedAt: string;
};

export type AdminSessionAttendanceSummary = {
  patientHasJoined: boolean;
  practitionerHasJoined: boolean;
  patientJoinedAt: string | null;
  practitionerJoinedAt: string | null;
  patientLeftAt: string | null;
  practitionerLeftAt: string | null;
  firstJoinedAt: string | null;
  lastLeftAt: string | null;
};

export type AdminSessionAttendanceResponseData = {
  sessionId: string;
  summary: AdminSessionAttendanceSummary;
  timeline: AdminSessionAttendanceTimelineItem[];
};
