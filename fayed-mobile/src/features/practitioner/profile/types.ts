export type PractitionerProfileStatus =
  | "DRAFT"
  | "PENDING_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "SUSPENDED"
  | "INACTIVE";

export type PractitionerApplicationStatus =
  | "DRAFT"
  | "PENDING_REVIEW"
  | "UNDER_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "WITHDRAWN"
  | null;

export interface PractitionerSpecialty {
  specialtyId: string;
  slug: string;
  title: string | null;
  isPrimary: boolean;
}

export interface PractitionerCredentialSummary {
  totalCredentials: number;
  pendingCount: number;
  approvedCount: number;
  rejectedCount: number;
  expiredCount: number;
  lastUploadedAt: string | null;
}

export interface PractitionerApplicationSummary {
  applicationId: string | null;
  status: PractitionerApplicationStatus;
  submittedAt: string | null;
  reviewedAt: string | null;
  reviewedByUserId: string | null;
  reviewDecisionReason: string | null;
  reviewNotes: string | null;
}

export interface PractitionerProfile {
  practitionerProfileId: string;
  userId: string;
  displayName: string | null;
  avatarUrl: string | null;
  professionalTitle: string | null;
  bio: string | null;
  countryCode: string | null;
  locale: string | null;
  timezone: string | null;
  languages: string[];
  yearsOfExperience: number | null;
  practitionerType: string;
  practitionerGender: string | null;
  primarySpecialtyCategoryId: string | null;
  payoutDestination: {
    provider: string;
    label: string | null;
    last4: string | null;
  } | null;
  profileStatus: PractitionerProfileStatus;
  specialties: PractitionerSpecialty[];
  isProfileCompleted: boolean;
  canSubmitApplication: boolean;
  applicationStatusSummary: PractitionerApplicationSummary;
  credentialSummary: PractitionerCredentialSummary;
  createdAt: string;
  updatedAt: string;
}

export interface PractitionerProfileResponse {
  message: string;
  profile: PractitionerProfile;
}
