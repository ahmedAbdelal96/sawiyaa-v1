import {
  CredentialReviewStatus,
  CredentialType,
  PractitionerApplicationStatus,
  PractitionerGender,
  PractitionerPayoutMethodType,
  PractitionerStatus,
  PractitionerType,
  ReviewCaseStatus,
  ReviewRequirementStatus,
} from '@prisma/client';
import { ProfessionalContentAuthoringInput } from '../services/practitioner-professional-content-authoring.service';

/**
 * Shared practitioners-module view and input types.
 * Keeping these central avoids ad-hoc inline object shapes across mappers and use cases.
 */
export interface UpdatePractitionerProfileInput {
  displayName?: string;
  professionalTitle?: string | null;
  bio?: string | null;
  professionalContent?: ProfessionalContentAuthoringInput['professionalContent'];
  primaryContentLocale?: ProfessionalContentAuthoringInput['primaryContentLocale'];
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
  countryCode?: string | null;
  accountHolderName?: string | null;
  bankName?: string | null;
  bankAccountNumber?: string | null;
  iban?: string | null;
  walletProvider?: string | null;
  walletIdentifier?: string | null;
  instapayIdentifier?: string | null;
  paypalEmail?: string | null;
  otherDetails?: string | null;
}

export interface PractitionerPayoutDestinationViewModel {
  methodType: PractitionerPayoutMethodType | null;
  countryCode: string | null;
  accountHolderName: string | null;
  bankName: string | null;
  bankAccountNumber: string | null;
  iban: string | null;
  walletProvider: string | null;
  walletIdentifier: string | null;
  instapayIdentifier?: string | null;
  paypalEmail?: string | null;
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
  reviewCase?: {
    id: string;
    caseType?: string;
    status: ReviewCaseStatus;
    submittedAt?: Date | null;
    dueAt?: Date | null;
    proposedSnapshot: Record<string, unknown> | null;
    sections: Array<{ section: string; status: string }>;
    requirements: Array<{
      id: string;
      section: string;
      fieldPath: string | null;
      credentialType?: string | null;
      status: string;
      title: string;
      reason: string;
      instructions?: string | null;
      dueAt?: Date | null;
      severity?: string;
      operationalImpact?: string[];
    }>;
  } | null;
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

export type PractitionerBaselineReadinessViewModel = {
  isProfileCompleted: boolean;
  canSubmitApplication: boolean;
  missingRequirements: string[];
  checks: PractitionerReadinessChecks;
};

export interface PractitionerReadinessViewModel extends PractitionerBaselineReadinessViewModel {
  remediationMissingRequirements: string[];
  professionalTitle: {
    approvedValue: string | null;
    proposedValue: string | null;
    requirementStatus: ReviewRequirementStatus | null;
    reviewStatus: ReviewCaseStatus | null;
    publiclyComplete: boolean;
    remediationComplete: boolean;
  };
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
  documentGroups?: {
    complete: boolean;
    groups: Record<string, unknown>;
    missingRequirements: string[];
    missingDocumentTypes: string[];
  };
}

export interface PractitionerProfileViewModel {
  practitionerProfileId: string;
  userId: string;
  displayName: string | null;
  avatarUrl: string | null;
  professionalTitle: string | null;
  bio: string | null;
  professionalContent?: {
    version: 1;
    primaryContentLocale: 'ar' | 'en' | null;
    locales: Partial<
      Record<
        'ar' | 'en',
        { professionalTitle?: string | null; bio?: string | null }
      >
    >;
  } | null;
  primaryContentLocale?: 'ar' | 'en' | null;
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
