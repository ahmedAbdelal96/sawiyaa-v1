import {
  ReviewModerationAction,
  SessionReviewStatus,
} from '@prisma/client';

export const REVIEW_COUNTABLE_STATUSES: SessionReviewStatus[] = [
  SessionReviewStatus.PENDING_MODERATION,
  SessionReviewStatus.PUBLISHED,
  SessionReviewStatus.REJECTED,
  SessionReviewStatus.HIDDEN,
];

export const REVIEW_PUBLIC_STATUS: SessionReviewStatus = SessionReviewStatus.PUBLISHED;

export const REVIEW_SUBMIT_INITIAL_STATUS: SessionReviewStatus =
  SessionReviewStatus.PENDING_MODERATION;

export const REVIEW_MAX_RATING = 5;

export const REVIEW_MIN_RATING = 1;

export const REVIEW_ALLOWED_MODERATION_ACTIONS: ReviewModerationAction[] = [
  ReviewModerationAction.APPROVED,
  ReviewModerationAction.REJECTED,
  ReviewModerationAction.HIDDEN,
  ReviewModerationAction.RESTORED,
  ReviewModerationAction.ARCHIVED,
];

export type ReviewNextPublicState = {
  status: SessionReviewStatus;
  publishedAt: Date | null;
  hiddenAt: Date | null;
  archivedAt: Date | null;
};

export type PractitionerRatingSummaryView = {
  averageOverallRating: number;
  totalPublishedReviews: number;
  totalSubmittedReviews: number;
};

export type PublicReviewItemView = {
  id: string;
  overallRating: number;
  textReview: string | null;
  submittedAt: string | null;
  publishedAt: string | null;
};
