/**
 * Admin practitioner-application review contracts.
 * Includes list/detail and decision payloads.
 */
import type { UserStatus } from "@/features/auth/types/auth.types";
import type {
  CredentialReviewStatus,
  CredentialType,
  PractitionerApplicationCompletionViewModel,
  PractitionerApplicationStatus,
  PractitionerGender,
  PractitionerPayoutDestination,
  PractitionerPayoutDestinationInput,
  PractitionerStatus,
  PractitionerType,
  PractitionerSpecialtySelectionInput,
} from "@/features/practitioners/types/practitioners.types";

export interface AdminSpecialtySummary {
  specialtyId: string;
  slug: string;
  title: string | null;
}

export type PractitionerApplicationKind = "NEW_APPLICATION" | "EDIT_REQUEST";
export type PractitionerApplicationListView = "ACTIVE" | "HISTORY" | "ALL";

export interface AdminProfileSpecialty extends AdminSpecialtySummary {
  isPrimary: boolean;
}

export interface PractitionerApplicationListItem {
  applicationId: string;
  practitionerProfileId: string;
  userId: string;
  displayName: string | null;
  practitionerType: PractitionerType;
  countryCode: string | null;
  applicationKind: PractitionerApplicationKind;
  mainSpecialty: AdminSpecialtySummary | null;
  applicationStatus: PractitionerApplicationStatus;
  submittedAt: string | null;
  updatedAt: string;
}

export interface PractitionerApplicationsPagination {
  page: number;
  limit: number;
  total: number;
}

export interface PractitionerApplicationSummary {
  total: number;
  newApplications: number;
  editRequests: number;
  activeApplications: number;
  submittedApplications: number;
  underReviewApplications: number;
  changesRequestedApplications: number;
  approvedApplications: number;
  rejectedApplications: number;
  archivedApplications: number;
}

export interface PractitionerApplicationsListResponse {
  message: string;
  applications: PractitionerApplicationListItem[];
  pagination: PractitionerApplicationsPagination;
  summary: PractitionerApplicationSummary;
}

export interface AdminApplicantEmailSummary {
  address: string | null;
  isVerified: boolean;
}

export interface AdminApplicantPhoneSummary {
  number: string | null;
  isVerified: boolean;
}

export interface AdminApplicantBasics {
  userId: string;
  practitionerProfileId: string;
  displayName: string | null;
  avatarUrl?: string | null;
  accountStatus: UserStatus;
  email: AdminApplicantEmailSummary;
  phone: AdminApplicantPhoneSummary;
  locale: string | null;
  timezone: string | null;
  countryCode: string | null;
}

export interface AdminPractitionerProfileSection {
  practitionerType: PractitionerType;
  practitionerGender: PractitionerGender | null;
  profileStatus: PractitionerStatus;
  avatarUrl?: string | null;
  professionalTitle: string | null;
  bio: string | null;
  yearsOfExperience: number | null;
  primarySpecialtyCategoryId: string | null;
  pricing: {
    session30: {
      egp: number | null;
      usd: number | null;
    };
    session60: {
      egp: number | null;
      usd: number | null;
    };
  };
  languages: string[];
  specialties: AdminProfileSpecialty[];
}

export interface AdminPractitionerCredential {
  credentialId: string;
  credentialType: CredentialType;
  fileUrl: string;
  reviewStatus: CredentialReviewStatus;
  expiresAt: string | null;
  uploadedAt: string;
  reviewedAt: string | null;
  reviewedByUserId: string | null;
  reviewNotes: string | null;
}

export interface AdminPractitionerApplicationSummary {
  applicationId: string;
  status: PractitionerApplicationStatus;
  submittedAt: string | null;
  reviewedAt: string | null;
  reviewedByUserId: string | null;
  reviewDecisionReason: string | null;
  reviewNotes: string | null;
}

export interface AdminReadinessSnapshot {
  isProfileCompleted: boolean;
  hasRequiredSpecialties: boolean;
  hasRequiredCredentials: boolean;
  hasPayoutDestination: boolean;
  canBeReviewed: boolean;
  canBeApproved: boolean;
  canRequestChanges: boolean;
}

export interface PractitionerApplicationDetails {
  applicant: AdminApplicantBasics;
  liveApplicant: AdminApplicantBasics;
  profile: AdminPractitionerProfileSection;
  liveProfile: AdminPractitionerProfileSection;
  credentials: AdminPractitionerCredential[];
  payoutDestination: PractitionerPayoutDestination | null;
  livePayoutDestination: PractitionerPayoutDestination | null;
  application: AdminPractitionerApplicationSummary;
  readinessSnapshot: AdminReadinessSnapshot;
  completion: PractitionerApplicationCompletionViewModel;
}

export interface PractitionerApplicationDetailsResponse {
  message: string;
  details: PractitionerApplicationDetails;
}

export interface PractitionerApplicationDecision {
  applicationId: string;
  practitionerProfileId: string;
  userId: string;
  status: PractitionerApplicationStatus;
  reviewedAt: string | null;
  reviewedByUserId: string | null;
  reviewDecisionReason: string | null;
  reviewNotes: string | null;
}

export interface PractitionerApplicationDecisionResponse {
  message: string;
  application: PractitionerApplicationDecision;
}

export interface ListPractitionerApplicationsParams {
  view?: PractitionerApplicationListView;
  kind?: PractitionerApplicationKind;
  status?: PractitionerApplicationStatus;
  q?: string;
  page?: number;
  limit?: number;
}

export interface ApprovePractitionerApplicationRequest {
  reason?: string;
  note?: string;
}

export interface RejectPractitionerApplicationRequest {
  reason: string;
  note?: string;
}

export interface RequestPractitionerApplicationChangesRequest {
  reason: string;
  note?: string;
}

export interface UpdatePractitionerApplicationDraftRequest {
  displayName?: string;
  practitionerType?: PractitionerType;
  practitionerGender?: PractitionerGender | null;
  professionalTitle?: string | null;
  bio?: string | null;
  yearsOfExperience?: number | null;
  countryCode?: string | null;
  languageCodes?: string[];
  specialtySelection?: PractitionerSpecialtySelectionInput;
  payoutDestination?: PractitionerPayoutDestinationInput | null;
}

export interface CreateAdminPractitionerApplicationCredentialRequest {
  credentialType: CredentialType;
  fileUrl: string;
  reviewStatus?: CredentialReviewStatus;
  reviewNotes?: string | null;
  expiresAt?: string | null;
}

export interface UpdateAdminPractitionerApplicationCredentialRequest {
  credentialType?: CredentialType;
  fileUrl?: string;
  reviewStatus?: CredentialReviewStatus;
  reviewNotes?: string | null;
  expiresAt?: string | null;
}

export interface PractitionerApplicationCredentialResponse {
  message: string;
  credential: AdminPractitionerCredential;
}

export interface PractitionerApplicationCredentialDeleteResponse {
  message: string;
  deletedCredentialId: string;
}

export interface CreateAdminPractitionerRequest {
  email: string;
  password: string;
  displayName?: string;
  practitionerType?: PractitionerType;
  practitionerGender?: PractitionerGender | null;
  professionalTitle?: string;
  bio?: string;
  yearsOfExperience?: number;
  countryCode?: string;
  languageCodes: string[];
  specialtySelection: PractitionerSpecialtySelectionInput;
  payoutDestination?: PractitionerPayoutDestinationInput | null;
  credentials?: Array<{
    credentialType: CredentialType;
    fileUrl: string;
    expiresAt?: string;
  }>;
  note?: string;
}
