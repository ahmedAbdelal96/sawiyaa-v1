/**
 * Practitioner feature contracts for current-practitioner self-service endpoints.
 */

export type PractitionerStatus =
  | "DRAFT"
  | "PENDING_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "SUSPENDED"
  | "INACTIVE";

export type PractitionerType =
  | "PSYCHOLOGIST"
  | "PSYCHIATRIST"
  | "NUTRITIONIST"
  | "WEIGHT_LOSS_SPECIALIST"
  | "COUNSELOR"
  | "OTHER";

export type PractitionerGender = "MALE" | "FEMALE";

export type PractitionerApplicationStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "CHANGES_REQUESTED"
  | "ARCHIVED";

export type CredentialType =
  | "LICENSE"
  | "DEGREE"
  | "CERTIFICATION"
  | "NATIONAL_ID"
  | "PASSPORT"
  | "MEMBERSHIP"
  | "OTHER";

export type CredentialReviewStatus = "PENDING" | "APPROVED" | "REJECTED" | "EXPIRED";

export type PractitionerPayoutMethodType = "BANK_ACCOUNT" | "IBAN" | "WALLET" | "OTHER";

export interface PractitionerPayoutDestination {
  methodType: PractitionerPayoutMethodType | null;
  accountHolderName: string | null;
  bankName: string | null;
  bankAccountNumber: string | null;
  iban: string | null;
  walletProvider: string | null;
  walletIdentifier: string | null;
  otherDetails: string | null;
}

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
  status: PractitionerApplicationStatus | null;
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
  practitionerType: PractitionerType;
  practitionerGender: PractitionerGender | null;
  primarySpecialtyCategoryId: string | null;
  payoutDestination: PractitionerPayoutDestination | null;
  profileStatus: PractitionerStatus;
  specialties: PractitionerSpecialty[];
  isProfileCompleted: boolean;
  canSubmitApplication: boolean;
  applicationStatusSummary: PractitionerApplicationSummary;
  credentialSummary: PractitionerCredentialSummary;
  createdAt: string;
  updatedAt: string;
}

export interface PractitionerProfileSuccessResponse {
  message: string;
  profile: PractitionerProfile;
}

export interface PractitionerSpecialtiesSuccessResponse {
  message: string;
  specialties: PractitionerSpecialty[];
}

export interface PractitionerCredential {
  credentialId: string;
  credentialType: CredentialType;
  fileUrl: string;
  reviewStatus: CredentialReviewStatus;
  expiresAt: string | null;
  uploadedAt: string;
  updatedAt: string;
}

export interface PractitionerCredentialListResponse {
  message: string;
  credentials: PractitionerCredential[];
}

export interface PractitionerCredentialUploadSuccessResponse {
  message: string;
  credential: PractitionerCredential;
}

export interface PractitionerReadinessChecks {
  hasDisplayName: boolean;
  hasProfessionalTitle: boolean;
  hasBio: boolean;
  hasCountry: boolean;
  hasYearsOfExperience: boolean;
  hasLanguage: boolean;
  hasSpecialty: boolean;
  hasCredential: boolean;
  hasPayoutDestination: boolean;
  isAccountActive: boolean;
  isPractitionerOtpVerified: boolean;
}

export interface PractitionerReadiness {
  isProfileCompleted: boolean;
  canSubmitApplication: boolean;
  missingRequirements: string[];
  checks: PractitionerReadinessChecks;
}

export interface PractitionerReadinessSuccessResponse {
  message: string;
  readiness: PractitionerReadiness;
}

export interface PractitionerApplicationStatusResponse {
  applicationId: string | null;
  status: PractitionerApplicationStatus | null;
  submittedAt: string | null;
  reviewedAt: string | null;
  reviewedByUserId: string | null;
  reviewDecisionReason: string | null;
  reviewNotes: string | null;
  isProfileCompleted: boolean;
  canSubmitApplication: boolean;
  missingRequirements: string[];
}

export interface PractitionerApplicationStatusSuccessResponse {
  message: string;
  application: PractitionerApplicationStatusResponse;
}

export interface PractitionerPayoutDestinationInput {
  methodType: PractitionerPayoutMethodType;
  accountHolderName?: string | null;
  bankName?: string | null;
  bankAccountNumber?: string | null;
  iban?: string | null;
  walletProvider?: string | null;
  walletIdentifier?: string | null;
  otherDetails?: string | null;
}

export interface PractitionerSpecialtySelectionInput {
  primarySpecialtyCategoryId: string;
  specialtyIds: string[];
}

export interface UpdatePractitionerProfileRequest {
  displayName?: string;
  professionalTitle?: string | null;
  bio?: string | null;
  countryCode?: string | null;
  yearsOfExperience?: number | null;
  practitionerType?: PractitionerType;
  practitionerGender?: PractitionerGender | null;
  locale?: "ar" | "en";
  timezone?: string;
  languageCodes?: string[];
  payoutDestination?: PractitionerPayoutDestinationInput | null;
}

export interface SetPractitionerSpecialtiesRequest extends PractitionerSpecialtySelectionInput {}

export interface SubmitPractitionerApplicationRequest {
  displayName?: string;
  professionalTitle?: string | null;
  bio?: string | null;
  countryCode?: string | null;
  yearsOfExperience?: number | null;
  practitionerType?: PractitionerType;
  practitionerGender?: PractitionerGender | null;
  locale?: "ar" | "en";
  timezone?: string;
  languageCodes?: string[];
  specialtySelection?: PractitionerSpecialtySelectionInput;
  payoutDestination?: PractitionerPayoutDestinationInput | null;
}

export interface UploadPractitionerCredentialMetadataRequest {
  credentialType: CredentialType;
  fileUrl: string;
  expiresAt?: string | null;
}

export interface UpdatePractitionerAvatarRequest {
  avatarUrl: string;
}

export interface PractitionerAvatarResponse {
  practitionerProfileId: string;
  avatarUrl: string | null;
}

export interface PractitionerAvatarSuccessResponse {
  message: string;
  avatar: PractitionerAvatarResponse;
}
