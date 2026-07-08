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

export type SessionPresentationStatus =
  | "UPCOMING"
  | "JOINABLE"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED"
  | "ENDED"
  | "UNAVAILABLE"
  | "NO_SHOW"
  | "UNDER_REVIEW";

export type SessionPresentationFilter =
  | "all"
  | "joinable"
  | "live"
  | "upcoming"
  | "finished"
  | "unavailable";

export type SessionMode = "VIDEO" | "AUDIO" | "CHAT";

export type SessionChatAvailabilityReason =
  | "ALLOWED"
  | "SESSION_NOT_STARTED"
  | "SESSION_ENDED"
  | "SESSION_CANCELLED"
  | "CONVERSATION_CLOSED"
  | "MODERATION_LOCKED"
  | "NOT_PARTICIPANT";

export interface SessionPractitionerSummary {
  id: string;
  slug: string;
  displayName: string | null;
}

export interface SessionPatientSummary {
  id: string;
  displayName: string | null;
}

export interface SessionChatAvailability {
  canRead: boolean;
  canSend: boolean;
  readOnly: boolean;
  reason: SessionChatAvailabilityReason;
}

export interface PractitionerSessionListItem {
  id: string;
  sessionCode: string;
  status: SessionStatus;
  presentationStatus: SessionPresentationStatus;
  scheduledStartAt: string | null;
  scheduledEndAt: string | null;
  durationMinutes: number;
  sessionMode: SessionMode;
  practitioner: SessionPractitionerSummary;
  patient: SessionPatientSummary | null;
  joinAvailability: SessionJoinAvailability;
  chatAvailability: SessionChatAvailability;
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
  presentationFilter?: SessionPresentationFilter;
  page?: number;
  limit?: number;
}

export interface SessionsListResponse {
  items: PractitionerSessionListItem[];
  pagination: SessionsPagination;
}

export interface PractitionerSessionSummary {
  totalItems: number;
  upcoming: number;
  ready: number;
  live: number;
  closed: number;
  actionRequired: number;
  unavailable: number;
}

export interface PractitionerSessionSummaryResponse {
  item: PractitionerSessionSummary;
}

export type SessionProvider = "NONE" | "DAILY";

export type SessionJoinBlockedReason =
  | "SESSION_NOT_JOINABLE_STATUS"
  | "SESSION_NOT_VIDEO_MODE"
  | "SESSION_TIME_WINDOW_NOT_OPEN"
  | "SESSION_RUNTIME_NOT_PREPARED"
  | "SESSION_JOIN_WINDOW_CLOSED"
  | "SESSION_ROOM_CLOSED";

export interface SessionJoinAvailability {
  canJoin: boolean;
  blockedReason: SessionJoinBlockedReason | null;
  availableAt: string | null;
  expiresAt: string | null;
}

export interface PractitionerSessionRuntime {
  provider: SessionProvider;
  isPrepared: boolean;
  roomName: string | null;
  roomUrl: string | null;
}

export interface PractitionerSessionProviderRuntime {
  name: SessionProvider;
  roomId: string | null;
  roomUrl: string | null;
  token: string | null;
  tokenExpiresAt: string | null;
  joinMode: "redirect_url" | "embedded" | "external_url" | null;
  payload: Record<string, unknown>;
}

export interface PractitionerSessionJoinContract {
  sessionId: string;
  status: SessionStatus;
  provider: SessionProvider;
  canJoin: boolean;
  blockedReason: SessionJoinBlockedReason | null;
  availableAt: string | null;
  expiresAt: string | null;
  roomName: string | null;
  roomUrl: string | null;
  joinToken: string | null;
  providerRuntime?: PractitionerSessionProviderRuntime | null;
}

export type PractitionerSessionRoomCloseReason =
  | "TECHNICAL_ISSUE"
  | "PATIENT_NO_SHOW"
  | "ENDED_BY_AGREEMENT"
  | "SAFETY_CONCERN"
  | "OTHER";

export interface ClosePractitionerSessionRuntimePayload {
  reason?: PractitionerSessionRoomCloseReason;
  note?: string;
}

export interface PractitionerSessionRoomCloseResult {
  sessionId: string;
  provider: SessionProvider;
  isClosed: boolean;
  wasAlreadyClosed: boolean;
  roomName: string | null;
  roomUrl: string | null;
  closedAt: string;
  closeReason: string | null;
  closeNote: string | null;
}

export interface PractitionerSessionRoomCloseResponse {
  item: PractitionerSessionRoomCloseResult;
}
