import { useQuery } from "@tanstack/react-query";
import {
  getPublicPractitionerReviews,
  getPublicPractitionerTrustSummary,
  listPublicPractitionerSlugCandidates,
} from "../api/practitioner-reviews.api";
import { practitionerReviewsQueryKeys } from "../constants/query-keys";
import type { ListPublicPractitionerReviewsParams } from "../types/practitioner-reviews.types";

export function usePractitionerPublicSlug(
  practitionerProfileId: string | null,
  displayName: string | null,
  enabled = true,
) {
  return useQuery({
    queryKey: practitionerReviewsQueryKeys.publicSlug(practitionerProfileId),
    queryFn: async () => {
      if (!practitionerProfileId || !displayName?.trim()) {
        return null;
      }

      const candidates = await listPublicPractitionerSlugCandidates(displayName.trim());
      const matched = candidates.items.find((item) => item.id === practitionerProfileId);
      return matched?.slug ?? null;
    },
    enabled: enabled && Boolean(practitionerProfileId) && Boolean(displayName?.trim()),
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
  });
}

export function usePublicPractitionerTrustSummary(slug: string | null, enabled = true) {
  return useQuery({
    queryKey: practitionerReviewsQueryKeys.trustSummary(slug),
    queryFn: () => getPublicPractitionerTrustSummary(slug as string),
    enabled: enabled && Boolean(slug),
    staleTime: 60_000,
    gcTime: 10 * 60_000,
  });
}

export function usePublicPractitionerReviews(
  slug: string | null,
  params: ListPublicPractitionerReviewsParams = {},
  enabled = true,
) {
  return useQuery({
    queryKey: practitionerReviewsQueryKeys.reviewsList(slug, params),
    queryFn: () => getPublicPractitionerReviews(slug as string, params),
    enabled: enabled && Boolean(slug),
    staleTime: 60_000,
    gcTime: 10 * 60_000,
  });
}
