/**
 * SSR-safe API layer for public specialty endpoints.
 * Uses shared server Axios client to avoid browser-only dependencies.
 */
import { serverGet } from "@/lib/api/server-http-client";
import type {
  SpecialtiesListResponse,
  SpecialtySuccessResponse,
} from "@/features/specialties/types/specialties.types";

export const SPECIALTIES_PUBLIC_ROUTES = {
  list: "/specialties",
  bySlug: (slug: string) => `/specialties/${slug}`,
} as const;

/**
 * Fetch all active specialties for SSR pages.
 */
export async function fetchPublicSpecialties(
  locale: string,
  q?: string,
): Promise<SpecialtiesListResponse> {
  return serverGet<SpecialtiesListResponse>(SPECIALTIES_PUBLIC_ROUTES.list, {
    locale,
    params: q ? { q } : undefined,
  });
}

/**
 * Fetch a single specialty by slug for SSR detail pages.
 * Returns null when backend returns 404.
 */
export async function fetchPublicSpecialtyBySlug(
  slug: string,
  locale: string,
): Promise<SpecialtySuccessResponse | null> {
  try {
    return await serverGet<SpecialtySuccessResponse>(
      SPECIALTIES_PUBLIC_ROUTES.bySlug(slug),
      { locale },
    );
  } catch (err) {
    if ((err as { status?: number }).status === 404) return null;
    throw err;
  }
}
