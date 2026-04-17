import type { ListPublicPractitionerReviewsParams } from "../types/practitioner-reviews.types";

export const practitionerReviewsQueryKeys = {
  all: ["practitioner-reviews"] as const,
  publicSlug: (practitionerProfileId: string | null) =>
    [...practitionerReviewsQueryKeys.all, "public-slug", practitionerProfileId ?? ""] as const,
  trustSummary: (slug: string | null) =>
    [...practitionerReviewsQueryKeys.all, "trust-summary", slug ?? ""] as const,
  reviews: () => [...practitionerReviewsQueryKeys.all, "public-reviews"] as const,
  reviewsList: (slug: string | null, params: ListPublicPractitionerReviewsParams = {}) =>
    [...practitionerReviewsQueryKeys.reviews(), slug ?? "", params] as const,
};
