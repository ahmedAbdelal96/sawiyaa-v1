export type PractitionerTrustFreshness = "NONE" | "RECENT" | "STALE";
export type PractitionerTrustVolumeLevel = "NONE" | "LOW" | "ESTABLISHED";

export type PractitionerTrustRationaleCode =
  | "NO_PUBLIC_REVIEWS"
  | "LOW_PUBLIC_REVIEW_VOLUME"
  | "ESTABLISHED_PUBLIC_REVIEW_VOLUME"
  | "RECENT_PUBLIC_FEEDBACK"
  | "PUBLIC_FEEDBACK_NOT_RECENT"
  | "NO_PUBLIC_FEEDBACK_TIMELINE";

export interface PublicPractitionerSlugCandidate {
  id: string;
  slug: string;
  displayName: string | null;
}

export interface PublicPractitionerSlugCandidatesData {
  items: PublicPractitionerSlugCandidate[];
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  };
}

export interface PublicPractitionerSummaryRef {
  id: string;
  slug: string;
  displayName: string | null;
}

export interface PublicPractitionerTrustSummary {
  averageOverallRating: number | null;
  totalPublicReviews: number;
  totalPublishedReviews: number;
  totalSubmittedReviews: number;
  latestPublishedReviewAt: string | null;
  hasEnoughPublicReviews: boolean;
  volumeLevel: PractitionerTrustVolumeLevel;
  freshness: PractitionerTrustFreshness;
  rationaleCodes: PractitionerTrustRationaleCode[];
}

export interface PublicPractitionerTrustSummaryData {
  practitioner: PublicPractitionerSummaryRef;
  summary: PublicPractitionerTrustSummary;
}

export interface PublicPractitionerReviewItem {
  id: string;
  overallRating: number;
  textReview: string | null;
  submittedAt: string | null;
  publishedAt: string | null;
}

export interface PublicPractitionerReviewsPagination {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

export interface PublicPractitionerReviewsData {
  summary: PublicPractitionerTrustSummary;
  items: PublicPractitionerReviewItem[];
  pagination: PublicPractitionerReviewsPagination;
}

export interface ListPublicPractitionerReviewsParams {
  page?: number;
  limit?: number;
}
