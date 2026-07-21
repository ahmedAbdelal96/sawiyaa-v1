export interface AdminPractitionerListItem {
  id: string;
  slug: string;
  displayName: string | null;
  email?: string | null;
  avatarUrl: string | null;
  professionalTitle: string | null;
  status: string;
  accountStatus: string;
  isPublicProfilePublished: boolean;
  publicationBlockers: Array<{ code: string; field?: string; messageKey: string }>;
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

export interface PractitionerPublicationImpact {
  activeUpcomingCount: number;
  scheduledTodayCount: number;
  nearestUpcomingAt: string | null;
  upcomingBookings: Array<{
    id: string;
    scheduledStartAt: string | null;
    scheduledEndAt: string | null;
    status: string;
    sessionMode: string;
  }>;
}

export interface PractitionerPublicationResponse {
  practitionerId: string;
  displayName: string | null;
  avatarUrl: string | null;
  practitionerStatus: string;
  accountStatus: string;
  isPublished: boolean;
  isReadyForPublication: boolean;
  blockers: Array<{ code: string; field?: string; messageKey: string }>;
  impact: PractitionerPublicationImpact;
}
