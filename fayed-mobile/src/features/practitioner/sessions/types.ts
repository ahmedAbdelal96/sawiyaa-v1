export type SessionStatus =
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

export type SessionMode = "VIDEO" | "AUDIO" | "CHAT";

export interface SessionPractitionerSummary {
  id: string;
  slug: string;
  displayName: string | null;
}

export interface SessionPatientSummary {
  id: string;
  displayName: string | null;
}

export interface PractitionerSessionListItem {
  id: string;
  sessionCode: string;
  status: SessionStatus;
  scheduledStartAt: string | null;
  scheduledEndAt: string | null;
  durationMinutes: number;
  sessionMode: SessionMode;
  practitioner: SessionPractitionerSummary;
  patient: SessionPatientSummary | null;
}

export interface PractitionerSessionDetails extends PractitionerSessionListItem {
  flowType: string;
  expiresAt: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  completedAt: string | null;
  expiredAt: string | null;
  timezone: string | null;
}

export interface SessionsPagination {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

export interface ListSessionsQuery {
  status?: SessionStatus;
  page?: number;
  limit?: number;
}

export interface SessionsListResponse {
  items: PractitionerSessionListItem[];
  pagination: SessionsPagination;
}

export type SessionProvider = "NONE" | "DAILY";

export type SessionJoinBlockedReason =
  | "SESSION_NOT_JOINABLE_STATUS"
  | "SESSION_NOT_VIDEO_MODE"
  | "SESSION_TIME_WINDOW_NOT_OPEN"
  | "SESSION_RUNTIME_NOT_PREPARED";

export interface PractitionerSessionRuntime {
  provider: SessionProvider;
  isPrepared: boolean;
  roomName: string | null;
  roomUrl: string | null;
}

export interface PractitionerSessionJoinContract {
  sessionId: string;
  status: SessionStatus;
  provider: SessionProvider;
  canJoin: boolean;
  blockedReason: SessionJoinBlockedReason | null;
  roomName: string | null;
  roomUrl: string | null;
  joinToken: string | null;
}
