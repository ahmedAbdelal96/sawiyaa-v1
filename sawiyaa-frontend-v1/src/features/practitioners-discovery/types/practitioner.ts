import { SUPPORTED_COUNTRY_CODES } from "@/constants/reference-data";

export type SpecialtyId =
  | "anxiety"
  | "depression"
  | "relationships"
  | "family"
  | "trauma"
  | "addiction"
  | "psychiatry"
  | "ocd";

export type LanguageCode = "ar" | "en" | "fr";

export type CountryCode = (typeof SUPPORTED_COUNTRY_CODES)[number];

export type PublicPractitioner = {
  id: string;
  slug: string;
  nameAr: string;
  nameEn: string;
  titleAr: string;
  titleEn: string;
  specialties: string[];
  languages: string[];
  country: string;
  currencyCode?: "EGP" | "USD";
  regionalPricingMode?: "EGYPT_LOCAL" | "INTERNATIONAL";
  resolvedCountryIsoCode?: string | null;
  practitionerType?: string;
  practitionerGender?: "male" | "female" | null;
  sessionPrice30?: number | null;
  sessionPrice60?: number | null;
  sessionPrice30Egp?: number | null;
  sessionPrice30Usd?: number | null;
  sessionPrice60Egp?: number | null;
  sessionPrice60Usd?: number | null;
  instantBookingPrice30Egp?: number | null;
  instantBookingPrice30Usd?: number | null;
  instantBookingPrice60Egp?: number | null;
  instantBookingPrice60Usd?: number | null;
  displaySessionPrice30?: number | null;
  displaySessionPrice60?: number | null;
  pricing?: {
    session30: {
      egp: number | null;
      usd: number | null;
    };
    session60: {
      egp: number | null;
      usd: number | null;
    };
  };
  isOnlineNow?: boolean;
  acceptsCoupon?: boolean;
  acceptsPackage: boolean;
  rating: number;
  reviewCount: number;
  sessionCount: number | null; // null = not provided by backend public contract
  yearsExperience: number;
  isVerified: boolean;
  initials: string;
  avatarUrl: string | null;
};

export type PractitionerFilterSpecialtyOption = {
  id: string;
  slug: string;
  name: string;
  nameAr?: string | null;
  nameEn?: string | null;
  category: {
    id: string;
    slug: string;
    name: string;
    nameAr?: string | null;
    nameEn?: string | null;
  } | null;
  practitionerCount: number;
};

export type PractitionerFilterOption = {
  value: string;
  label: string;
  description?: string | null;
  practitionerCount: number;
};

export type PractitionerFilterNumberOption = {
  value: number;
  label: string;
  practitionerCount: number;
};

export type PractitionerRatingThresholdOption = {
  value: number;
  label: string;
};

export type PractitionerFeeBounds = {
  min: number;
  max: number;
  actualMin?: number;
  currency: "EGP" | "USD";
  step: number;
};

export type PractitionerAvailabilityFilterSupport = {
  onlineNowSupported: true;
  availableTodaySupported: false;
  availableThisWeekSupported: false;
};

export type PractitionerFiltersMetadata = {
  specialties: PractitionerFilterSpecialtyOption[];
  specialtyCategories: PractitionerFilterOption[];
  languages: PractitionerFilterOption[];
  countries: PractitionerFilterOption[];
  practitionerKinds: PractitionerFilterOption[];
  genders: PractitionerFilterOption[];
  durations: PractitionerFilterNumberOption[];
  ratingThresholds: PractitionerRatingThresholdOption[];
  feeBounds: PractitionerFeeBounds;
  availability: PractitionerAvailabilityFilterSupport;
};

/** Legacy filter params used by mock data helpers (not sent to backend). */
export type PractitionerFilterParams = {
  q?: string;
  specialty?: string;
  lang?: string;
  sort?: "rating" | "experience" | "sessions";
};

/** Query params sent to the real backend API. */
export type PractitionerQueryParams = {
  search?: string;
  specialtySlug?: string;
  specialtyCategorySlug?: string;
  language?: string;
  country?: string;
  practitionerKind?: "doctor" | "therapist";
  gender?: "male" | "female";
  duration?: 30 | 60;
  onlineNow?: boolean;
  availableToday?: boolean;
  availableThisWeek?: boolean;
  acceptsCoupon?: boolean;
  acceptsPackage?: boolean;
  minRating?: number;
  minSessionFee?: number;
  maxSessionFee?: number;
  sort?: "recommended" | "experience" | "rating";
  page?: number;
  limit?: number;
};

export type ActiveFeeFilterContext = {
  duration?: 30 | 60;
  minSessionFee?: number;
  maxSessionFee?: number;
};

export type PractitionerPagination = {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
};

export const LANGUAGE_CODES: LanguageCode[] = ["ar", "en", "fr"];
export const COUNTRY_CODES: CountryCode[] = [...SUPPORTED_COUNTRY_CODES];
