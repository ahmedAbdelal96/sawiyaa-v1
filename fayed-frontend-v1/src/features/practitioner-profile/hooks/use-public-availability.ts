import { useQuery } from "@tanstack/react-query";
import { fetchPublicAvailabilityWindows } from "../api/practitioner-profile.api";
import { practitionerProfileQueryKeys } from "../constants/query-keys";

/**
 * Fetches available time windows for a public practitioner profile.
 * Re-fetches automatically when slug/from/to change (week navigation).
 *
 * @param slug - Practitioner public slug
 * @param from - Inclusive range start (ISO 8601 UTC)
 * @param to   - Exclusive range end (ISO 8601 UTC)
 */
export function usePublicAvailabilityWindows(slug: string, from: string, to: string) {
  return useQuery({
    queryKey: practitionerProfileQueryKeys.availabilityWindows(slug, from, to),
    queryFn: () => fetchPublicAvailabilityWindows(slug, from, to),
    staleTime: 2 * 60_000,
    gcTime: 5 * 60_000,
    enabled: Boolean(slug && from && to),
  });
}
