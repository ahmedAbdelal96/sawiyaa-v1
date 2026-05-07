export interface PublicPractitionerSpecialty {
  specialtyId: string;
  slug: string;
  title: string | null;
  isPrimary: boolean;
}

export interface PublicPractitionerRatingSummary {
  averageRating: number | null;
  totalReviews: number;
}

export interface PublicPractitionerCredentialsSummary {
  totalCredentials: number;
  approvedCredentials: number;
}

export interface PublicPractitionerPricingCurrency {
  egp: number | null;
  usd: number | null;
}

export interface PublicPractitionerPricing {
  session30: PublicPractitionerPricingCurrency;
  session60: PublicPractitionerPricingCurrency;
}

export type PublicPractitionerPresenceStatus =
  | "OFFLINE"
  | "ONLINE"
  | "AWAY"
  | "BUSY";

export interface PublicPractitionerPresence {
  status: PublicPractitionerPresenceStatus;
  isInstantBookingEnabled: boolean;
  lastSeenAt: string | null;
}

export interface PublicPractitionerListItem {
  id: string;
  slug: string;
  displayName: string | null;
  professionalTitle: string | null;
  bioSnippet: string | null;
  specialties: PublicPractitionerSpecialty[];
  languages: string[];
  countryCode: string | null;
  practitionerType: string;
  practitionerGender: string | null;
  pricing: PublicPractitionerPricing;
  sessionPrice30: number | null;
  sessionPrice60: number | null;
  sessionPrice30Egp?: number | null;
  sessionPrice30Usd?: number | null;
  sessionPrice60Egp?: number | null;
  sessionPrice60Usd?: number | null;
  isOnlineNow: boolean;
  acceptsCoupon: boolean;
  acceptsPackage: boolean;
  yearsExperience: number | null;
  ratingSummary: PublicPractitionerRatingSummary;
  avatarUrl: string | null;
  isVerified: boolean;
}

export interface PublicPractitionerDetails {
  id: string;
  slug: string;
  displayName: string | null;
  professionalTitle: string | null;
  fullBio: string | null;
  specialties: PublicPractitionerSpecialty[];
  languages: string[];
  countryCode: string | null;
  yearsExperience: number | null;
  pricing: PublicPractitionerPricing;
  sessionPrice30: number | null;
  sessionPrice60: number | null;
  sessionPrice30Egp?: number | null;
  sessionPrice30Usd?: number | null;
  sessionPrice60Egp?: number | null;
  sessionPrice60Usd?: number | null;
  ratingSummary: PublicPractitionerRatingSummary;
  credentialsSummary: PublicPractitionerCredentialsSummary;
  isVerified: boolean;
  avatarUrl: string | null;
}

export interface PublicPractitionerPresenceResponse {
  success: boolean;
  data: {
    presence: PublicPractitionerPresence;
  };
}

export interface PublicPractitionersPagination {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

export interface PublicPractitionersListResponse {
  success: boolean;
  data: {
    items: PublicPractitionerListItem[];
    pagination: PublicPractitionersPagination;
  };
}

export interface PublicPractitionerDetailsResponse {
  success: boolean;
  data: {
    item: PublicPractitionerDetails;
  };
}

export interface ListPublicPractitionersFilters {
  search?: string;
  specialtySlug?: string;
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
  page?: number;
  limit?: number;
  sort?: "recommended" | "rating" | "experience";
}
