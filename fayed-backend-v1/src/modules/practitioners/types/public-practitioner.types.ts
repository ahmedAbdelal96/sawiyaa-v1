/**
 * Public read-model types for practitioner listing/details responses.
 * These shapes intentionally exclude internal/admin/private fields.
 */
export interface PublicPractitionerListItemViewModel {
  id: string;
  slug: string;
  displayName: string | null;
  professionalTitle: string | null;
  bioSnippet: string | null;
  specialties: Array<{
    specialtyId: string;
    slug: string;
    title: string | null;
    isPrimary: boolean;
  }>;
  languages: string[];
  countryCode: string | null;
  practitionerType: string;
  practitionerGender: string | null;
  sessionPrice30: number | null;
  sessionPrice60: number | null;
  isOnlineNow: boolean;
  acceptsCoupon: boolean;
  acceptsPackage: boolean;
  yearsExperience: number | null;
  ratingSummary: {
    averageRating: number | null;
    totalReviews: number;
  };
  avatarUrl: string | null;
  isVerified: boolean;
}

export interface PublicPractitionerDetailsViewModel {
  id: string;
  slug: string;
  displayName: string | null;
  professionalTitle: string | null;
  fullBio: string | null;
  specialties: Array<{
    specialtyId: string;
    slug: string;
    title: string | null;
    isPrimary: boolean;
  }>;
  languages: string[];
  countryCode: string | null;
  yearsExperience: number | null;
  ratingSummary: {
    averageRating: number | null;
    totalReviews: number;
  };
  credentialsSummary: {
    totalCredentials: number;
    approvedCredentials: number;
  };
  isVerified: boolean;
  avatarUrl: string | null;
}
