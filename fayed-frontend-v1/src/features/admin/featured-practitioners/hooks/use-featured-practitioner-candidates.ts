"use client";

import { useQuery } from "@tanstack/react-query";
import { listEligibleFeaturedPractitioners } from "../api/featured-practitioner-candidates.api";

export function useEligibleFeaturedPractitionerCandidates(
  search: string,
  enabled = true,
) {
  return useQuery({
    queryKey: ["admin", "featured-practitioners", "eligible-candidates", search.trim()],
    queryFn: () => listEligibleFeaturedPractitioners(search),
    enabled,
    staleTime: 30_000,
  });
}
