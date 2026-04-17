// Aligned with backend SessionReviewStatus enum
export type SessionReviewStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "PENDING_MODERATION"
  | "PUBLISHED"
  | "REJECTED"
  | "HIDDEN"
  | "ARCHIVED";

// Aligned with backend ReviewModerationAction enum
export type ReviewModerationAction =
  | "APPROVED"
  | "REJECTED"
  | "HIDDEN"
  | "RESTORED"
  | "ARCHIVED";

export interface ReviewPagination {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

export interface AdminReviewPractitioner {
  id: string;
  slug: string;
  displayName: string | null;
}

export interface AdminReviewSession {
  id: string;
  scheduledStartAt: string | null;
}

export interface PatientReviewPractitioner {
  id: string;
  slug: string;
  displayName: string | null;
}

export interface PatientReviewItem {
  id: string;
  sessionId: string;
  overallRating: number;
  title: string | null;
  textReview: string | null;
  status: SessionReviewStatus;
  submittedAt: string | null;
  publishedAt: string | null;
  moderatedAt: string | null;
  practitioner: PatientReviewPractitioner;
}

export interface AdminReviewItem {
  id: string;
  sessionId: string;
  overallRating: number;
  title: string | null;
  textReview: string | null;
  status: SessionReviewStatus;
  submittedAt: string | null;
  publishedAt: string | null;
  moderatedAt: string | null;
  practitioner: AdminReviewPractitioner;
  patientProfileId: string;
  practitionerProfileId: string;
  session: AdminReviewSession;
}

export interface AdminReviewsListData {
  items: AdminReviewItem[];
  pagination: ReviewPagination;
}

export interface AdminReviewItemData {
  item: AdminReviewItem;
}

export interface PatientReviewsListData {
  items: PatientReviewItem[];
  pagination: ReviewPagination;
}

export interface PatientReviewItemData {
  item: PatientReviewItem;
}

export interface ModerationResultData {
  item: AdminReviewItem;
  action: ReviewModerationAction;
}

export interface ListPatientReviewsParams {
  page?: number;
  limit?: number;
  status?: SessionReviewStatus;
}

export interface ListAdminReviewsParams {
  page?: number;
  limit?: number;
  status?: SessionReviewStatus;
  practitionerId?: string;
  sessionId?: string;
  needsModeration?: boolean;
}

export interface ModerateReviewRequest {
  action: ReviewModerationAction;
  moderatorNote?: string;
}

// Allowed moderation actions per current status — derived from backend ValidateReviewModerationTransitionService
export const ALLOWED_MODERATION_ACTIONS: Record<SessionReviewStatus, ReviewModerationAction[]> = {
  DRAFT: ["APPROVED", "REJECTED", "HIDDEN", "ARCHIVED"],
  SUBMITTED: ["APPROVED", "REJECTED", "HIDDEN", "ARCHIVED"],
  PENDING_MODERATION: ["APPROVED", "REJECTED", "HIDDEN", "ARCHIVED"],
  PUBLISHED: ["HIDDEN", "REJECTED", "ARCHIVED"],
  HIDDEN: ["RESTORED", "REJECTED", "ARCHIVED"],
  REJECTED: ["RESTORED", "HIDDEN", "ARCHIVED"],
  ARCHIVED: ["RESTORED"],
};
