// =============================================================================
// Phase 4B — Admin Manual Session Decision types
// Mirrors backend CreateAdminSessionManualDecisionDto and
// AdminSessionManualDecisionItemDto
// =============================================================================

export type SessionAdminDecisionType =
  | "MARK_COMPLETED"
  | "MARK_PATIENT_NO_SHOW"
  | "MARK_PRACTITIONER_NO_SHOW"
  | "MARK_BOTH_NO_SHOW"
  | "MARK_TECHNICAL_REVIEW"
  | "MARK_INSUFFICIENT_EVIDENCE";

export type SessionStatus =
  | "DRAFT"
  | "PENDING_PAYMENT"
  | "PENDING_PRACTITIONER_CONFIRMATION"
  | "UPCOMING"
  | "UPCOMING"
  | "READY_TO_JOIN"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED"
  | "PATIENT_NO_SHOW"
  | "EXPIRED"
  | "REFUND_PENDING"
  | "REFUNDED";

// Re-use AdminSessionSafeMetadata from the runtime types to avoid duplicate export
import type { AdminSessionSafeMetadata } from "./admin-session-runtime.types";
export type { AdminSessionSafeMetadata };

export type AdminSessionDecisionRecommendedOutcomeSnapshot = {
  recommendedOutcome: string | null;
  riskFlags: string[];
};

export type AdminSessionDecisionAttendanceSummarySnapshot = {
  patient: {
    hasJoined: boolean;
    joinCount: number;
    reconnectCount: number;
    firstJoinedAt: string | null;
    lastLeftAt: string | null;
  };
  practitioner: {
    hasJoined: boolean;
    joinCount: number;
    reconnectCount: number;
    firstJoinedAt: string | null;
    lastLeftAt: string | null;
  };
  overlap: {
    overlapSeconds: number;
    overlapMinutes: number;
    hasMeaningfulOverlap: boolean;
  };
  meeting: {
    meetingStartedAt: string | null;
    meetingEndedAt: string | null;
    sourceConfidence: string;
  };
};

export type AdminSessionDecisionEvidenceTimelineSnapshotItem = {
  id: string;
  kind: string;
  eventType: string;
  occurredAt: string;
  severity: string;
  titleKey: string;
  safeMetadataSummary: AdminSessionSafeMetadata | null;
};

export type AdminSessionDecisionItem = {
  id: string;
  sessionId: string;
  decisionType: SessionAdminDecisionType;
  previousSessionStatus: SessionStatus;
  nextSessionStatus: SessionStatus | null;
  isFinal: boolean;
  supersedesDecisionId: string | null;
  reasonCode: string;
  adminNote: string | null;
  decidedBy: {
    userId: string;
    displayName: string;
  };
  createdAt: string;
  recommendedOutcomeSnapshot: AdminSessionDecisionRecommendedOutcomeSnapshot | null;
  attendanceSummarySnapshot: AdminSessionDecisionAttendanceSummarySnapshot | null;
  evidenceTimelineSnapshot: AdminSessionDecisionEvidenceTimelineSnapshotItem[] | null;
};

export type AdminSessionManualDecisionListResponseData = {
  items: AdminSessionDecisionItem[];
};

export type CreateAdminSessionManualDecisionRequest = {
  decisionType: SessionAdminDecisionType;
  reasonCode: string;
  adminNote?: string | null;
  confirmEvidenceReviewed: true;
  confirmNoAutomaticRefund: true;
  confirmNoAutomaticPayout: true;
  supersedePrevious?: boolean;
};

export type AdminSessionManualDecisionSuccessResponseData =
  AdminSessionDecisionItem;
