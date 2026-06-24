export interface AdminPractitionerListItem {
  id: string;
  slug: string;
  displayName: string | null;
  email?: string | null;
  avatarUrl: string | null;
  professionalTitle: string | null;
  status: string;
  practitionerType: string;
  countryCode: string | null;
  isOnlineNow: boolean;
  isVerified: boolean;
  yearsExperience: number | null;
  ratingSummary: {
    averageRating: number | null;
    totalReviews: number;
  };
}

export interface AdminPractitionersPagination {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

export interface AdminPractitionersListResponse {
  items: AdminPractitionerListItem[];
  pagination: AdminPractitionersPagination;
}

export interface ListAdminPractitionersParams {
  search?: string;
  practitionerKind?: "doctor" | "therapist";
  gender?: "male" | "female";
  country?: string;
  onlineNow?: boolean;
  minRating?: number;
  page?: number;
  limit?: number;
  sort?: "recommended" | "experience" | "rating" | "newest" | "oldest";
}

export interface UpdateAdminPractitionerAvatarRequest {
  avatarUrl: string;
}

export interface AdminPractitionerAvatarResponse {
  id: string;
  avatarUrl: string | null;
}

export interface AdminPractitionerAvatarSuccessResponse {
  message: string;
  avatar: AdminPractitionerAvatarResponse;
}
