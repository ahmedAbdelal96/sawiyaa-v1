/**
 * Frontend types for the sessions feature.
 * Derived directly from backend session DTOs and view models.
 */

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

export type SessionMode = "VIDEO";
export type SessionProvider = "NONE" | "DAILY";

export type SessionJoinBlockedReason =
  | "SESSION_NOT_JOINABLE_STATUS"
  | "SESSION_NOT_VIDEO_MODE"
  | "SESSION_TIME_WINDOW_NOT_OPEN"
  | "SESSION_RUNTIME_NOT_PREPARED";

export type SessionPractitionerSummary = {
  id: string;
  slug: string;
  displayName: string | null;
};

export type SessionPatientSummary = {
  id: string;
  displayName: string | null;
};

/**
 * Full session details view model — shape returned by POST /patients/me/sessions
 * and GET /patients/me/sessions/:id (after extractData unwraps the envelope).
 */
export type SessionItem = {
  id: string;
  sessionCode: string;
  status: SessionStatus;
  scheduledStartAt: string | null;
  scheduledEndAt: string | null;
  durationMinutes: number;
  sessionMode: SessionMode;
  practitioner: SessionPractitionerSummary;
  patient: SessionPatientSummary | null;
  flowType: string;
  expiresAt: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  completedAt: string | null;
  expiredAt: string | null;
  timezone: string | null;
};

/**
 * Payload for POST /patients/me/sessions (scheduled flow).
 * `durationMinutes` must be 30 or 60 — backend validates with @IsIn([30, 60]).
 * `scheduledStartAt` must be a future UTC ISO 8601 datetime.
 */
export type CreateScheduledSessionInput = {
  practitionerSlug: string;
  scheduledStartAt: string;
  durationMinutes: 30 | 60;
  sessionMode?: SessionMode;
};

/** Shape of `data` field after extractData on the create session response */
export type CreateSessionResponseData = {
  item: SessionItem;
};

/**
 * List item shape — returned by GET /patients/me/sessions (data.items[]).
 * Subset of SessionItem: no flowType, expiresAt, cancellation, or completion fields.
 */
export type SessionListItem = {
  id: string;
  sessionCode: string;
  status: SessionStatus;
  scheduledStartAt: string | null;
  scheduledEndAt: string | null;
  durationMinutes: number;
  sessionMode: SessionMode;
  practitioner: SessionPractitionerSummary;
  patient: SessionPatientSummary | null;
};

export type SessionsPagination = {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
};

export type SessionsListResponseData = {
  items: SessionListItem[];
  pagination: SessionsPagination;
};

export type ListSessionsParams = {
  status?: SessionStatus;
  page?: number;
  limit?: number;
};

export type SessionJoinItem = {
  sessionId: string;
  status: SessionStatus;
  provider: SessionProvider;
  canJoin: boolean;
  blockedReason: SessionJoinBlockedReason | null;
  roomName: string | null;
  roomUrl: string | null;
  joinToken: string | null;
};

export type SessionJoinResponseData = {
  item: SessionJoinItem;
};

export type SessionRuntimeItem = {
  provider: SessionProvider;
  isPrepared: boolean;
  roomName: string | null;
  roomUrl: string | null;
};

export type SessionRuntimeResponseData = {
  item: SessionRuntimeItem;
};
