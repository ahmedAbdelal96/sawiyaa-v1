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
  /**
   * Phase 3 — Backend-supplied participant identity. All sub-fields are
   * nullable when the user has no verified contact row.
   */
  participants?: AdminSessionParticipantIdentity;
  videoRoomClose: AdminSessionVideoRoomCloseEvidence;
  relatedSupportTickets: AdminSessionRelatedSupportTicket[];
  /**
   * Phase 3 — Lifecycle presentation status. Computed by the existing
   * presentation-status resolver.
   */
  presentationStatus?: AdminSessionPresentationStatus | null;
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

// =============================================================================
// Phase 3 — Extended attendance summary (mirrors backend engine output)
// =============================================================================

export type AdminSessionInspectorPresenceInterval = {
  joinedAt: string;
  leftAt: string | null;
  durationSeconds: number;
};

export type AdminSessionInspectorRoleAttendanceSummary = {
  firstJoinedAt: string | null;
  lastLeftAt: string | null;
  totalPresenceSeconds: number;
  joinedIntervals: AdminSessionInspectorPresenceInterval[];
  joinCount: number;
  reconnectCount: number;
  lateSeconds: number | null;
  joinedOnTime: boolean;
  leftEarly: boolean;
  noShowCandidate: boolean;
  hadAnyJoinAttempt: boolean;
  hadBlockedJoinAttempt: boolean;
  lastBlockedReason: string | null;
  tokenIssuedCount: number;
  hasDuplicateLikeJoinEvents: boolean;
  duplicateLikeJoinEventCount: number;
};

export type AdminSessionInspectorMeetingBounds = {
  meetingStartedAt: string | null;
  meetingEndedAt: string | null;
  firstAnyParticipantJoinedAt: string | null;
  lastAnyParticipantLeftAt: string | null;
  totalMeetingObservedSeconds: number | null;
  sourceConfidence: "HIGH" | "MEDIUM" | "LOW";
};

export type AdminSessionInspectorOverlapSummary = {
  overlapSeconds: number;
  overlapMinutes: number;
  overlapPercentOfScheduledDuration: number | null;
  firstOverlapAt: string | null;
  lastOverlapAt: string | null;
  hasMeaningfulOverlap: boolean;
  /**
   * Optional defensive default: some attendance payloads may not include this
   * array (older records, engine fallbacks). Components must treat it as
   * possibly missing.
   */
  confidenceFlags?: string[];
};

export type AdminSessionInspectorEvidenceFlags = {
  attendanceEventCount: number;
  platformJoinAttemptCount: number;
  unknownParticipantEventCount: number;
  duplicateIgnoredCount: number;
  hasOutOfOrderEvents: boolean;
  hasMissingJoinEvent: boolean;
  hasMissingLeaveEvent: boolean;
  hasOnlyPatientJoined: boolean;
  hasOnlyPractitionerJoined: boolean;
  hasNoParticipants: boolean;
  hasReconnects: boolean;
  hasDuplicateLikeJoinEvents: boolean;
  duplicateLikeJoinEventCount: number;
  hasPrematureDecisionRisk: boolean;
  hasTechnicalRisk: boolean;
  hasOpenIntervalsWithoutCloseBoundary: boolean;
  openIntervalCount: number;
  missingJoinEventCount: number;
  missingLeaveEventCount: number;
};

export type AdminSessionInspectorRecommendedOutcome =
  | "COMPLETION_CANDIDATE"
  | "PATIENT_NO_SHOW_CANDIDATE"
  | "PRACTITIONER_NO_SHOW_CANDIDATE"
  | "BOTH_NO_SHOW_CANDIDATE"
  | "TECHNICAL_REVIEW_CANDIDATE"
  | "INSUFFICIENT_EVIDENCE"
  | "MANUAL_REVIEW_REQUIRED";

export type AdminSessionInspectorRecommendation = {
  recommendedOutcome: AdminSessionInspectorRecommendedOutcome;
  recommendedReason: string;
  riskFlags: string[];
  isFinalDecision: false;
  requiresAdminReview: boolean;
};

export type AdminSessionInspectorSessionTiming = {
  scheduledStartAt: string | null;
  scheduledEndAt: string | null;
  durationMinutes: number | null;
  joinWindowOpenedAt: string | null;
  joinWindowClosedAt: string | null;
};

export type AdminSessionInspectorExtendedSummary = {
  session: AdminSessionInspectorSessionTiming;
  patient: AdminSessionInspectorRoleAttendanceSummary;
  practitioner: AdminSessionInspectorRoleAttendanceSummary;
  meeting: AdminSessionInspectorMeetingBounds;
  overlap: AdminSessionInspectorOverlapSummary;
  evidence: AdminSessionInspectorEvidenceFlags;
  recommendation: AdminSessionInspectorRecommendation;
};

export type AdminSessionAttendanceResponseData = {
  sessionId: string;
  summary: AdminSessionAttendanceSummary;
  timeline: AdminSessionAttendanceTimelineItem[];
  /**
   * Phase 3 — Persisted room-close evidence and related support tickets.
   */
  videoRoomClose: AdminSessionVideoRoomCloseEvidence;
  relatedSupportTickets: AdminSessionRelatedSupportTicket[];
  /**
   * Phase 3 — Platform-side evidence events. Empty array when none exist.
   */
  platformTimeline?: AdminSessionEvidenceTimelineItem[];
  /**
   * Phase 3 — Unified chronological evidence timeline. Empty array when
   * no events exist.
   */
  evidenceTimeline?: AdminSessionEvidenceTimelineItem[];
  /**
   * Phase 3 — Backend-supplied participant identity (displayName + primary
   * email + primary phone for both patient and practitioner).
   */
  participants?: AdminSessionParticipantIdentity;
  /**
   * Phase 3 — Lifecycle presentation status.
   */
  presentationStatus?: AdminSessionPresentationStatus | null;
  /**
   * Phase 3 — Structured attendance evidence from the Attendance Summary Engine.
   * Advisory only; not a final business decision.
   */
  extendedSummary: AdminSessionInspectorExtendedSummary | null;
};

// =============================================================================
// Phase 3 — Backend evidence enrichment types
// =============================================================================

export type AdminSessionParticipantContact = {
  userId: string | null;
  displayName: string | null;
  email: string | null;
  phone: string | null;
};

export type AdminSessionParticipantIdentity = {
  patient: AdminSessionParticipantContact;
  practitioner: AdminSessionParticipantContact;
};

export type AdminSessionPresentationStatus =
  | "UPCOMING"
  | "JOINABLE"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED"
  | "ENDED"
  | "UNAVAILABLE";

export type AdminSessionEvidenceActorRole =
  | "PATIENT"
  | "PRACTITIONER"
  | "ADMIN"
  | "SYSTEM"
  | "UNKNOWN";

export type AdminSessionEvidenceSource = "PLATFORM" | "DAILY_WEBHOOK" | "SYSTEM";

export type AdminSessionEvidenceSeverity =
  | "INFO"
  | "SUCCESS"
  | "WARNING"
  | "ERROR"
  | "NEUTRAL";

export type AdminSessionEvidenceKind = "ATTENDANCE" | "PLATFORM";

export type AdminSessionSafeMetadata = Record<
  string,
  string | number | boolean | null
>;

export type AdminSessionEvidenceTimelineItem = {
  id: string;
  sessionId: string;
  kind: AdminSessionEvidenceKind;
  eventType: string;
  actorRole: AdminSessionEvidenceActorRole;
  actorUserId: string | null;
  actorDisplayName: string | null;
  occurredAt: string;
  recordedAt: string;
  source: AdminSessionEvidenceSource;
  severity: AdminSessionEvidenceSeverity;
  titleKey: string;
  safeMetadataSummary: AdminSessionSafeMetadata | null;
};

export type AdminSessionVideoRoomCloseEvidence = {
  closedAt: string | null;
  closedByUserId: string | null;
  closedByDisplayName: string | null;
  closeReason: string | null;
  closeNote: string | null;
};

export type AdminSessionRelatedSupportTicket = {
  id: string;
  category: string;
  status: string;
  priority: string;
  subject: string;
  lastMessageAt: string | null;
  createdAt: string;
  updatedAt: string;
};
