export type PendingPatientReviewPractitioner = {
  id: string;
  slug: string;
  displayName: string | null;
};

export type PendingPatientReviewItem = {
  sessionId: string;
  completedAt: string | null;
  scheduledStartAt: string | null;
  practitioner: PendingPatientReviewPractitioner;
};

export type ReviewPagination = {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
};

export type PendingPatientReviewsResponse = {
  items: PendingPatientReviewItem[];
  pagination: ReviewPagination;
};

export type CreateSessionReviewInput = {
  overallRating: number;
  title?: string;
  textReview?: string;
};

export type PatientReviewItem = {
  item: {
    id: string;
  };
};
