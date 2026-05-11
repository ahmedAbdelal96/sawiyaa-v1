/**
 * SSR-safe API layer for the public practitioners listing endpoint.
 * Owned by: practitioners-discovery feature.
 *
 * The single-practitioner detail endpoint lives in:
 *   practitioner-profile/api/practitioner-profile-ssr.api.ts
 *
 * Exports BackendPublicPractitionerListItem and mapBackendListItemToUi so the
 * profile API can extend the same shape without duplicating the mapping logic.
 */
import { serverGet } from "@/lib/api/server-http-client";
import type {
  PublicPractitioner,
  PractitionerPagination,
  PractitionerQueryParams,
} from "../types/practitioner";

type BackendSpecialty = {
  slug: string;
};

type BackendRatingSummary = {
  averageRating: number | null;
  totalReviews: number;
};

export type BackendPublicPractitionerListItem = {
  id: string;
  slug: string;
  displayName: string | null;
  professionalTitle: string | null;
  specialties: BackendSpecialty[];
  languages: string[];
  countryCode: string | null;
  currencyCode: "EGP" | "USD";
  regionalPricingMode: "EGYPT_LOCAL" | "INTERNATIONAL";
  resolvedCountryIsoCode: string | null;
  practitionerType: string;
  practitionerGender: string | null;
  sessionPrice30: number | null;
  sessionPrice60: number | null;
  sessionPrice30Egp: number | null;
  sessionPrice30Usd: number | null;
  sessionPrice60Egp: number | null;
  sessionPrice60Usd: number | null;
  displaySessionPrice30: number | null;
  displaySessionPrice60: number | null;
  isOnlineNow: boolean;
  acceptsCoupon: boolean;
  acceptsPackage: boolean;
  yearsExperience: number | null;
  ratingSummary: BackendRatingSummary;
  isVerified: boolean;
};

type PractitionersListData = {
  items: BackendPublicPractitionerListItem[];
  pagination: PractitionerPagination;
};

export const PRACTITIONERS_PUBLIC_ROUTES = {
  list: "/public/practitioners",
  bySlug: (slug: string) => `/public/practitioners/${slug}`,
} as const;

function buildInitials(displayName: string | null): string {
  if (!displayName?.trim()) return "DR";
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

export function mapBackendListItemToUi(item: BackendPublicPractitionerListItem): PublicPractitioner {
  const displayName = item.displayName ?? "";
  const title = item.professionalTitle ?? "";

  return {
    id: item.id,
    slug: item.slug,
    nameAr: displayName,
    nameEn: displayName,
    titleAr: title,
    titleEn: title,
    specialties: item.specialties.map((s) => s.slug),
    languages: item.languages ?? [],
    country: (item.countryCode ?? "").toLowerCase(),
    currencyCode: item.currencyCode,
    regionalPricingMode: item.regionalPricingMode,
    resolvedCountryIsoCode: item.resolvedCountryIsoCode,
    practitionerType: item.practitionerType,
    practitionerGender:
      item.practitionerGender?.toLowerCase() === "male"
        ? "male"
        : item.practitionerGender?.toLowerCase() === "female"
          ? "female"
          : null,
    sessionPrice30: item.sessionPrice30 ?? null,
    sessionPrice60: item.sessionPrice60 ?? null,
    sessionPrice30Egp: item.sessionPrice30Egp ?? null,
    sessionPrice30Usd: item.sessionPrice30Usd ?? null,
    sessionPrice60Egp: item.sessionPrice60Egp ?? null,
    sessionPrice60Usd: item.sessionPrice60Usd ?? null,
    displaySessionPrice30: item.displaySessionPrice30 ?? null,
    displaySessionPrice60: item.displaySessionPrice60 ?? null,
    pricing: {
      session30: {
        egp: item.sessionPrice30Egp ?? null,
        usd: item.sessionPrice30Usd ?? null,
      },
      session60: {
        egp: item.sessionPrice60Egp ?? null,
        usd: item.sessionPrice60Usd ?? null,
      },
    },
    isOnlineNow: item.isOnlineNow ?? false,
    acceptsCoupon: item.acceptsCoupon ?? false,
    acceptsPackage: item.acceptsPackage ?? false,
    rating: item.ratingSummary?.averageRating ?? 0,
    reviewCount: item.ratingSummary?.totalReviews ?? 0,
    sessionCount: null,
    yearsExperience: item.yearsExperience ?? 0,
    isVerified: item.isVerified ?? false,
    initials: buildInitials(displayName),
  };
}

/**
 * Fetch a paginated list of public practitioners.
 * Supports search, specialty filter, language filter, sort, and pagination.
 */
export async function fetchPublicPractitioners(
  locale: string,
  params?: PractitionerQueryParams,
): Promise<{ items: PublicPractitioner[]; pagination: PractitionerPagination }> {
  const data = await serverGet<PractitionersListData>(PRACTITIONERS_PUBLIC_ROUTES.list, {
    locale,
    params: {
      search: params?.search,
      specialtySlug: params?.specialtySlug,
      language: params?.language,
      country: params?.country,
      practitionerKind: params?.practitionerKind,
      gender: params?.gender,
      duration: params?.duration,
      onlineNow: params?.onlineNow,
      availableToday: params?.availableToday,
      availableThisWeek: params?.availableThisWeek,
      acceptsCoupon: params?.acceptsCoupon,
      acceptsPackage: params?.acceptsPackage,
      minRating: params?.minRating,
      minSessionFee: params?.minSessionFee,
      maxSessionFee: params?.maxSessionFee,
      sort: params?.sort,
      page: params?.page,
      limit: params?.limit,
    },
  });

  return {
    items: data.items.map(mapBackendListItemToUi),
    pagination: data.pagination,
  };
}

