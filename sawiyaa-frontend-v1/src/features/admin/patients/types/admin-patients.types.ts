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

