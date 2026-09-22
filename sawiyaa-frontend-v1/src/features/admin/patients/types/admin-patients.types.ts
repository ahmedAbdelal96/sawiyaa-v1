export type AdminPatientStatus =
  | "ACTIVE"
  | "INACTIVE"
  | "SUSPENDED"
  | "PENDING_VERIFICATION"
  | "PENDING_APPROVAL"
  | "DELETED";

export type AdminPatientListItem = {
  id: string;
  userId: string;
  displayName: string | null;
  primaryEmail: string | null;
  primaryPhone: string | null;
  status: AdminPatientStatus;
  countryCode: string | null;
  onboardingCompletedAt: string | null;
  createdAt: string;
};

export type AdminPatientsPagination = {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
};

export type AdminPatientsStats = {
  completedOnboarding: number;
  incompleteOnboarding: number;
};

export type AdminPatientsListResponseData = {
  items: AdminPatientListItem[];
  pagination: AdminPatientsPagination;
  stats: AdminPatientsStats;
};

export type AdminPatientDetailsItem = {
  id: string;
  userId: string;
  displayName: string | null;
  primaryEmail: string | null;
  primaryPhone: string | null;
  status: AdminPatientStatus;
  countryCode: string | null;
  gender: string | null;
  dateOfBirth: string | null;
  onboardingCompletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  packages: Array<{
    id: string; title: string | null; planCode: string | null; status: string;
    sessionCount: number; completedSessions: number; reservedSessions: number; availableSessions: number;
    nextSessionAt: string | null; amount: string; currency: string; paidAt: string | null; refundedAt: string | null;
    practitioner: { id: string; name: string | null } | null; settlementId: string | null;
  }>;
  academy: Array<{
    id: string; programId: string; programSlug: string; programTitleAr: string; programTitleEn: string;
    status: string; paymentStatus: string; amount: string; currency: string; registeredAt: string;
    attendanceCount: number; totalSessions: number; certificateIssued: boolean; paymentId: string | null;
  }>;
};

export type AdminPatientDetailsResponseData = {
  item: AdminPatientDetailsItem;
};

export type ListAdminPatientsParams = {
  search?: string;
  status?: "active" | "inactive" | "suspended" | "pending";
  onboarding?: "all" | "completed" | "incomplete";
  page?: number;
  limit?: number;
};

