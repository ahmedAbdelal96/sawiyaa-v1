export type PractitionerProfileStatus =
  | "DRAFT"
  | "PENDING_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "SUSPENDED"
  | "INACTIVE";

export type PractitionerPayoutMethodType =
  | "BANK_ACCOUNT"
  | "IBAN"
  | "WALLET"
  | "OTHER";

export type PractitionerApplicationStatus =
  | "DRAFT"
  | "PENDING_REVIEW"
  | "UNDER_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "CHANGES_REQUESTED"
  | "ARCHIVED"
  | null;

export interface PractitionerSpecialty {
  specialtyId: string;
  slug: string;
  title: string | null;
  isPrimary: boolean;
}

export interface PractitionerPricingCurrency {
  egp: number | null;
  usd: number | null;
}

export interface PractitionerPricing {
  session30: PractitionerPricingCurrency;
  session60: PractitionerPricingCurrency;
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
  acceptsPackage: boolean;
  pricing: PractitionerPricing;
  payoutDestination: {
    methodType: PractitionerPayoutMethodType | null;
    countryCode: string | null;
    accountHolderName: string | null;
    bankName: string | null;
    bankAccountNumber: string | null;
    iban: string | null;
    walletProvider: string | null;
    walletIdentifier: string | null;
    otherDetails: string | null;
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

export interface PractitionerReadinessResponse {
  message: string;
  readiness: PractitionerReadiness;
}

export interface PractitionerApplicationStatusResponse {
  applicationId: string | null;
  status:
    | "DRAFT"
    | "SUBMITTED"
    | "UNDER_REVIEW"
    | "APPROVED"
    | "REJECTED"
    | "CHANGES_REQUESTED"
    | "ARCHIVED"
    | null;
  submittedAt: string | null;
  reviewedAt: string | null;
  reviewedByUserId: string | null;
  reviewDecisionReason: string | null;
  reviewNotes: string | null;
  submissionSnapshot: Record<string, unknown> | null;
  isProfileCompleted: boolean;
  canSubmitApplication: boolean;
  missingRequirements: string[];
}

export interface PractitionerApplicationStatusResult {
  message: string;
  application: PractitionerApplicationStatusResponse;
}

export interface UpdatePractitionerProfileRequest {
  displayName?: string;
  professionalTitle?: string | null;
  bio?: string | null;
  countryCode?: string | null;
  yearsOfExperience?: number | null;
  practitionerType?:
    | "PSYCHOLOGIST"
    | "PSYCHIATRIST"
    | "NUTRITIONIST"
    | "WEIGHT_LOSS_SPECIALIST"
    | "COUNSELOR"
    | "OTHER";
  practitionerGender?: "MALE" | "FEMALE" | null;
  locale?: "ar" | "en";
  timezone?: string;
  languageCodes?: string[];
  sessionPrice30Egp?: number | null;
  sessionPrice30Usd?: number | null;
  sessionPrice60Egp?: number | null;
  sessionPrice60Usd?: number | null;
  acceptsPackage?: boolean;
  payoutDestination?:
      | {
        methodType: PractitionerPayoutMethodType;
        countryCode?: string | null;
        accountHolderName?: string | null;
        bankName?: string | null;
        bankAccountNumber?: string | null;
        iban?: string | null;
        walletProvider?: string | null;
        walletIdentifier?: string | null;
        otherDetails?: string | null;
      }
    | null;
}

export interface UpdatePractitionerProfileResponse {
  message: string;
  profile: PractitionerProfile;
}
