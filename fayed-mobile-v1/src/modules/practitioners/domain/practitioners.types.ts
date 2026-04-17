export type Specialty = {
  id: string;
  slug: string;
  name: string | null;
  description: string | null;
  isActive: boolean;
  sortOrder: number;
};

export type PractitionerListFilters = {
  search?: string;
  specialtySlug?: string;
  language?: string;
  page?: number;
  limit?: number;
};

export type PractitionerPagination = {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
};

export type PractitionerListItem = {
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
};

export type PractitionerProfile = {
  id: string;
  slug: string;
  displayName: string | null;
  professionalTitle: string | null;
  fullBio: string | null;
  specialties: PractitionerListItem["specialties"];
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
};

export type AvailabilityWindow = {
  startsAt: string;
  endsAt: string;
};

export type AvailabilityWindows = {
  timezone: string;
  range: {
    from: string;
    to: string;
  };
  windows: AvailabilityWindow[];
};
