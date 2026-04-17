/**
 * SSR-safe API layer for the public practitioner profile (detail) endpoint.
 * Owned by: practitioner-profile feature.
 *
 * fetchPublicPractitioners (listing) lives in practitioners-discovery/api/.
 * This file only owns the single-practitioner detail endpoint.
 */
import { serverGet } from "@/lib/api/server-http-client";
import type { PublicArticleListItem } from "@/features/articles-public/types/articles-public.types";
import {
  PRACTITIONERS_PUBLIC_ROUTES,
  mapBackendListItemToUi,
  type BackendPublicPractitionerListItem,
} from "@/features/practitioners-discovery/api/practitioners-ssr.api";
import type {
  PractitionerProfile,
  PublicPractitionerPresence,
} from "../types/profile";

type BackendPublicPractitionerDetailsItem = BackendPublicPractitionerListItem & {
  fullBio: string | null;
  credentialsSummary: {
    totalCredentials: number;
    approvedCredentials: number;
  };
};

/** Extended practitioner data as returned by the detail endpoint. */
export type PractitionerDetailItem = PractitionerProfile;

type BackendPractitionerDetailData = {
  item: BackendPublicPractitionerDetailsItem;
};

type PractitionerDetailData = {
  item: PractitionerDetailItem;
};

function mapBackendDetailsToUi(
  item: BackendPublicPractitionerDetailsItem,
): PractitionerDetailItem {
  const base = mapBackendListItemToUi(item);
  return {
    ...base,
    bioAr: item.fullBio ?? "",
    bioEn: item.fullBio ?? "",
    approachAr: "",
    approachEn: "",
    credentialsSummary: item.credentialsSummary,
  };
}

/**
 * Fetch a single practitioner profile by slug.
 * Returns null when the backend returns 404.
 */
export async function fetchPublicPractitionerBySlug(
  slug: string,
  locale: string,
): Promise<PractitionerDetailData | null> {
  try {
    const data = await serverGet<BackendPractitionerDetailData>(
      PRACTITIONERS_PUBLIC_ROUTES.bySlug(slug),
      { locale },
    );
    return {
      item: mapBackendDetailsToUi(data.item),
    };
  } catch (err) {
    if ((err as { status?: number }).status === 404) return null;
    throw err;
  }
}

type BackendPublicPresence = {
  status: PublicPractitionerPresence["status"];
  isInstantBookingEnabled: boolean;
  lastSeenAt: string | null;
};

type BackendPublicPresenceData = {
  presence: BackendPublicPresence;
};

/**
 * Fetch public-safe presence state for the public profile sidebar.
 * This stays separate from the profile payload because the backend owns it in
 * the Presence module, not the practitioners public profile contract.
 */
export async function fetchPublicPractitionerPresence(
  slug: string,
  locale: string,
): Promise<PublicPractitionerPresence | null> {
  try {
    const data = await serverGet<BackendPublicPresenceData>(
      `${PRACTITIONERS_PUBLIC_ROUTES.bySlug(slug)}/presence`,
      { locale },
    );

    return data.presence;
  } catch (err) {
    if ((err as { status?: number }).status === 404) return null;
    throw err;
  }
}

type PublicReviewItem = {
  id: string;
  overallRating: number;
  textReview: string | null;
  submittedAt: string | null;
  publishedAt: string | null;
};

type PractitionerRatingSummary = {
  averageOverallRating: number | null;
  totalPublicReviews: number;
  totalPublishedReviews: number;
  totalSubmittedReviews: number;
  latestPublishedReviewAt: string | null;
  hasEnoughPublicReviews: boolean;
  volumeLevel: "NONE" | "LOW" | "ESTABLISHED";
  freshness: "NONE" | "RECENT" | "STALE";
  rationaleCodes: string[];
};

type PractitionerTrustBlockData = {
  practitioner: {
    id: string;
    slug: string;
    displayName: string | null;
  };
  summary: PractitionerRatingSummary;
  highlightedReviews: PublicReviewItem[];
  contentSuggestions: PublicArticleListItem[];
  compositionMeta: {
    generatedAt: string;
    reasonCodes: string[];
  };
};

/**
 * Fetch the backend-composed trust block for the public practitioner profile.
 * This endpoint intentionally composes trust summary, moderation-safe review
 * snippets, and public-safe content suggestions on the backend.
 */
export async function fetchPublicPractitionerTrustBlock(
  slug: string,
  locale: string,
): Promise<PractitionerTrustBlockData | null> {
  try {
    return await serverGet<PractitionerTrustBlockData>(
      `${PRACTITIONERS_PUBLIC_ROUTES.bySlug(slug)}/trust-block`,
      {
        locale,
        params: {
          locale,
          reviewLimit: 3,
          contentLimit: 3,
        },
      },
    );
  } catch (err) {
    if ((err as { status?: number }).status === 404) return null;
    throw err;
  }
}
