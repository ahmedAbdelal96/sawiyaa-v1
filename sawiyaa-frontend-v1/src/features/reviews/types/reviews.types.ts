// Aligned with backend SessionReviewStatus enum
export type SessionReviewStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "PENDING_MODERATION"
  | "PUBLISHED"
  | "REJECTED"
  | "HIDDEN"
  | "ARCHIVED";

// Aligned with backend SessionReviewModerationDecision enum
export type ReviewModerationDecision =
  | "APPROVE_AS_IS"
  | "EDIT_AND_APPROVE"
  | "REJECT_PUBLISHING"
  | "INTERNAL_NOTE_ONLY"
  | "EXCLUDE_FROM_PUBLIC_AVERAGE"
  | "AUTO_APPROVED_POSITIVE";

// Admin moderation requests use the explicit decision contract.
export type ReviewModerationRequestDecision = Exclude<
  ReviewModerationDecision,
  "AUTO_APPROVED_POSITIVE"
>;

// Backward-compatible alias for existing imports while the UI migrates.
export type ReviewModerationAction = ReviewModerationRequestDecision;

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

export interface AdminReviewPatient {
  id: string;
  displayName: string | null;
  label: string;
  isAnonymous: boolean;
}

export interface AdminReviewSession {
  id: string;
  scheduledStartAt: string | null;
}

export interface AdminReviewModerationSummary {
  originalRatingValue: number;
  publicRatingValue: number | null;
  moderationDecision: ReviewModerationDecision | null;
  moderatedByUserId: string | null;
  moderatedAt: string | null;
  moderationReason: string | null;
  countsInPublicAverage: boolean;
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

export interface PendingPatientReviewPractitioner {
  id: string;
  slug: string;
  displayName: string | null;
}

export interface PendingPatientReviewItem {
  sessionId: string;
  completedAt: string | null;
  scheduledStartAt: string | null;
  practitioner: PendingPatientReviewPractitioner;
}

export interface AdminReviewItem {
  id: string;
  sessionId: string;
  overallRating: number;
  originalRatingValue: number;
  publicRatingValue: number | null;
  title: string | null;
  textReview: string | null;
  status: SessionReviewStatus;
  moderationDecision: ReviewModerationDecision | null;
  moderatedByUserId: string | null;
  submittedAt: string | null;
  publishedAt: string | null;
  moderatedAt: string | null;
  moderationReason: string | null;
  countsInPublicAverage: boolean;
  practitioner: AdminReviewPractitioner;
  patient: AdminReviewPatient;
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

export interface PendingPatientReviewsListData {
  items: PendingPatientReviewItem[];
  pagination: ReviewPagination;
}

export interface PatientReviewItemData {
  item: PatientReviewItem;
}

export interface ModerationResultData {
  item: AdminReviewItem;
  decision: ReviewModerationDecision;
  action: ReviewModerationDecision;
}

export interface ListPatientReviewsParams {
  page?: number;
  limit?: number;
  status?: SessionReviewStatus;
}

export interface ListPendingPatientReviewsParams {
  page?: number;
  limit?: number;
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
  decision: ReviewModerationRequestDecision;
  publicRatingValue?: number;
  moderationReason?: string;
}

export interface CreateSessionReviewInput {
  overallRating: number;
  title?: string;
  textReview?: string;
}

// Allowed moderation decisions per current status — derived from backend ValidateReviewModerationTransitionService
export const ALLOWED_MODERATION_DECISIONS: Record<
  SessionReviewStatus,
  ReviewModerationRequestDecision[]
> = {
  DRAFT: [
    "APPROVE_AS_IS",
    "EDIT_AND_APPROVE",
    "REJECT_PUBLISHING",
    "INTERNAL_NOTE_ONLY",
    "EXCLUDE_FROM_PUBLIC_AVERAGE",
  ],
  SUBMITTED: [
    "APPROVE_AS_IS",
    "EDIT_AND_APPROVE",
    "REJECT_PUBLISHING",
    "INTERNAL_NOTE_ONLY",
    "EXCLUDE_FROM_PUBLIC_AVERAGE",
  ],
  PENDING_MODERATION: [
    "APPROVE_AS_IS",
    "EDIT_AND_APPROVE",
    "REJECT_PUBLISHING",
    "INTERNAL_NOTE_ONLY",
    "EXCLUDE_FROM_PUBLIC_AVERAGE",
  ],
  PUBLISHED: [
    "APPROVE_AS_IS",
    "EDIT_AND_APPROVE",
    "REJECT_PUBLISHING",
    "INTERNAL_NOTE_ONLY",
    "EXCLUDE_FROM_PUBLIC_AVERAGE",
  ],
  HIDDEN: [
    "APPROVE_AS_IS",
    "EDIT_AND_APPROVE",
    "INTERNAL_NOTE_ONLY",
    "EXCLUDE_FROM_PUBLIC_AVERAGE",
  ],
  REJECTED: [
    "APPROVE_AS_IS",
    "EDIT_AND_APPROVE",
    "INTERNAL_NOTE_ONLY",
    "EXCLUDE_FROM_PUBLIC_AVERAGE",
  ],
  ARCHIVED: [],
};

export const ALLOWED_MODERATION_ACTIONS = ALLOWED_MODERATION_DECISIONS;
