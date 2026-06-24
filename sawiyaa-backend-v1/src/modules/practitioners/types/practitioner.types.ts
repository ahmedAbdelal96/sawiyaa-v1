import {
  CredentialReviewStatus,
  CredentialType,
  PractitionerApplicationStatus,
  PractitionerGender,
  PractitionerPayoutMethodType,
  PractitionerStatus,
  PractitionerType,
} from '@prisma/client';

/**
 * Shared practitioners-module view and input types.
 * Keeping these central avoids ad-hoc inline object shapes across mappers and use cases.
 */
export interface UpdatePractitionerProfileInput {
  displayName?: string;
  professionalTitle?: string | null;
  bio?: string | null;
  countryCode?: string | null;
  yearsOfExperience?: number | null;
  practitionerType?: PractitionerType;
  practitionerGender?: PractitionerGender | null;
  sessionPrice30Egp?: number | null;
  sessionPrice30Usd?: number | null;
  sessionPrice60Egp?: number | null;
  sessionPrice60Usd?: number | null;
  instantBookingPrice30Egp?: number | null;
  instantBookingPrice30Usd?: number | null;
  instantBookingPrice60Egp?: number | null;
  instantBookingPrice60Usd?: number | null;
  locale?: string;
  acceptsPackage?: boolean;
  timezone?: string | null;
  languageCodes?: string[];
  payoutDestination?: PractitionerPayoutDestinationInput | null;
}

export interface PractitionerSpecialtySelectionInput {
  primarySpecialtyCategoryId: string;
  specialtyIds: string[];
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

export interface PractitionerPayoutDestinationViewModel {
  methodType: PractitionerPayoutMethodType | null;
  accountHolderName: string | null;
  bankName: string | null;
  bankAccountNumber: string | null;
  iban: string | null;
  walletProvider: string | null;
  walletIdentifier: string | null;
  otherDetails: string | null;
}

export interface PractitionerSpecialtyViewModel {
  specialtyId: string;
  slug: string;
  title: string | null;
  isPrimary: boolean;
}

export interface PractitionerCredentialViewModel {
  credentialId: string;
  credentialType: CredentialType;
  fileUrl: string;
  reviewStatus: CredentialReviewStatus;
  expiresAt: Date | null;
  uploadedAt: Date;
  updatedAt: Date;
}

export interface PractitionerCredentialSummaryViewModel {
  totalCredentials: number;
  pendingCount: number;
  approvedCount: number;
  rejectedCount: number;
  expiredCount: number;
  lastUploadedAt: Date | null;
}

export interface PractitionerApplicationStatusViewModel {
  applicationId: string | null;
  status: PractitionerApplicationStatus | null;
  submittedAt: Date | null;
  reviewedAt: Date | null;
  reviewedByUserId: string | null;
  reviewDecisionReason: string | null;
  reviewNotes: string | null;
  submissionSnapshot: Record<string, unknown> | null;
  completion: PractitionerApplicationCompletionViewModel;
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
  hasAcademicCertificate: boolean;
  hasPayoutDestination: boolean;
  isAccountActive: boolean;
  isPractitionerOtpVerified: boolean;
}

export interface PractitionerReadinessViewModel {
  isProfileCompleted: boolean;
  canSubmitApplication: boolean;
  missingRequirements: string[];
  checks: PractitionerReadinessChecks;
}

export type PractitionerApplicationCompletionStepKey =
  | 'basicProfile'
  | 'professionalDetails'
  | 'pricing'
  | 'qualifications'
  | 'documents'
  | 'payoutDetails'
  | 'reviewSubmit';

export type PractitionerApplicationCompletionSeverity =
  | 'BLOCKER'
  | 'WARNING'
  | 'INFO';

export type PractitionerApplicationCompletionRequirementScope =
  | 'SUBMISSION'
  | 'APPROVAL'
  | 'OPTIONAL';

export interface PractitionerApplicationCompletionIssue {
  code: string;
  field?: string;
  stepKey: PractitionerApplicationCompletionStepKey;
  severity: PractitionerApplicationCompletionSeverity;
  requirementScope: PractitionerApplicationCompletionRequirementScope;
  messageKey: string;
  metadata?: Record<string, unknown>;
}

export interface PractitionerApplicationCompletionStep {
  key: PractitionerApplicationCompletionStepKey;
  titleKey: string;
  status: 'complete' | 'incomplete' | 'warning';
  percent: number;
  requiredCount: number;
  completedRequiredCount: number;
  issues: PractitionerApplicationCompletionIssue[];
}

export interface PractitionerApplicationCompletionViewModel {
  overallPercent: number;
  canSubmit: boolean;
  blockers: PractitionerApplicationCompletionIssue[];
  warnings: PractitionerApplicationCompletionIssue[];
  steps: PractitionerApplicationCompletionStep[];
}

export interface PractitionerProfileViewModel {
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
  acceptsPackage: boolean;
  pricing: {
    session30: { egp: number | null; usd: number | null };
    session60: { egp: number | null; usd: number | null };
  };
  instantBookingPrice30Egp: number | null;
  instantBookingPrice30Usd: number | null;
  instantBookingPrice60Egp: number | null;
  instantBookingPrice60Usd: number | null;
  payoutDestination: PractitionerPayoutDestinationViewModel | null;
  profileStatus: PractitionerStatus;
  specialties: PractitionerSpecialtyViewModel[];
  isProfileCompleted: boolean;
  canSubmitApplication: boolean;
  completion: PractitionerApplicationCompletionViewModel;
  applicationStatusSummary: PractitionerApplicationStatusViewModel;
  credentialSummary: PractitionerCredentialSummaryViewModel;
  createdAt: Date;
  updatedAt: Date;
}
