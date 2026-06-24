/**
 * Client-side API layer for the public practitioner profile feature.
 * Used by interactive client components (e.g. the availability viewer).
 * SSR-only calls (detail, presence) live in practitioner-profile-ssr.api.ts.
 */
import httpClient from "@/lib/api/http-client";
import { extractData } from "@/lib/api/response";
import type { ApiPayload } from "@/lib/api/contracts";
import type { PublicAvailabilityWindowsData } from "../types/public-availability.types";

/**
 * Fetches concrete UTC availability windows for a practitioner within a date range.
 * Backend computes these from weekly recurring slots + active exceptions.
 *
 * @param slug  - Practitioner public slug
 * @param from  - Inclusive range start (ISO 8601 UTC)
 * @param to    - Exclusive range end (ISO 8601 UTC). Must be within 31 days of `from`.
 */
export async function fetchPublicAvailabilityWindows(
  slug: string,
  from: string,
  to: string,
): Promise<PublicAvailabilityWindowsData> {
  const response = await httpClient.get<ApiPayload<PublicAvailabilityWindowsData>>(
    `/public/practitioners/${slug}/availability/windows`,
    { params: { from, to } },
  );
  return extractData(response.data);
}
