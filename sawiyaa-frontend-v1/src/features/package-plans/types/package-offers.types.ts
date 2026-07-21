import type { SessionMode } from "@/features/sessions/types/sessions.types";

export type PackageOfferSortOption =
  | "recommended"
  | "highest_rated"
  | "lowest_price"
  | "highest_savings";

export type ListPackageOffersParams = {
  page?: number;
  limit?: number;
  search?: string;
  specialtyId?: string;
  sessionCount?: number;
  durationMinutes?: number;
  sessionMode?: SessionMode;
  sort?: PackageOfferSortOption;
};

export type PackageOfferQuote = {
  currencyCode: string;
  baseSessionPrice: string;
  undiscountedTotal: string;
  discountAmount: string;
  patientPayableTotal: string;
};

export type PackageOfferItem = {
  practitioner: {
    id: string;
    publicSlug: string;
    displayName: string;
    avatarUrl: string | null;
    professionalTitle: string | null;
    specialties: Array<{ id: string; name: string }>;
  };
  packagePlan: {
    id: string;
    code: string;
    title: string;
    description: string | null;
    sessionCount: number;
    discountPercent: string;
  };
  selectedDurationMinutes: number;
  sessionMode: SessionMode;
  availableDurations: Array<{
    durationMinutes: number;
    quote: PackageOfferQuote;
  }>;
  activeQuote: PackageOfferQuote;
  ctaHref: string;
};

export type PackageOffersListResponseData = {
  items: PackageOfferItem[];
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  };
};
