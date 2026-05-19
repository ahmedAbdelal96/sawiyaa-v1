import {
  CredentialReviewStatus,
  CredentialType,
  PractitionerApplicationStatus,
  PractitionerGender,
  PractitionerPayoutMethodType,
  PractitionerStatus,
  PractitionerType,
  UserStatus,
} from '@prisma/client';
import { PractitionerApplicationCompletionViewModel } from '@modules/practitioners/types/practitioner.types';

/**
 * Shared read-model types for admin practitioner application review.
 * Keeping them centralized avoids response-shape drift across use cases and mappers.
 */
export enum AdminPractitionerApplicationKind {
  NEW_APPLICATION = 'NEW_APPLICATION',
  EDIT_REQUEST = 'EDIT_REQUEST',
}

export enum AdminPractitionerApplicationListView {
  ACTIVE = 'ACTIVE',
  HISTORY = 'HISTORY',
  ALL = 'ALL',
}

export interface AdminPractitionerApplicationListItemViewModel {
  applicationId: string;
  practitionerProfileId: string;
  userId: string;
  displayName: string | null;
  practitionerType: PractitionerType;
  countryCode: string | null;
  applicationKind: AdminPractitionerApplicationKind;
  mainSpecialty: {
    specialtyId: string;
    slug: string;
    title: string | null;
  } | null;
  applicationStatus: PractitionerApplicationStatus;
  submittedAt: Date | null;
  updatedAt: Date;
}

export interface AdminPractitionerApplicationSummaryViewModel {
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

export interface AdminPractitionerApplicationDetailsViewModel {
  applicant: {
    userId: string;
    practitionerProfileId: string;
    displayName: string | null;
    avatarUrl: string | null;
    accountStatus: UserStatus;
    email: {
      address: string | null;
      isVerified: boolean;
    };
    phone: {
      number: string | null;
      isVerified: boolean;
    };
    locale: string | null;
    timezone: string | null;
    countryCode: string | null;
  };
  liveApplicant: {
    userId: string;
    practitionerProfileId: string;
    displayName: string | null;
    avatarUrl: string | null;
    accountStatus: UserStatus;
    email: {
      address: string | null;
      isVerified: boolean;
    };
    phone: {
      number: string | null;
      isVerified: boolean;
    };
    locale: string | null;
    timezone: string | null;
    countryCode: string | null;
  };
  profile: {
    practitionerType: PractitionerType;
    practitionerGender: PractitionerGender | null;
    profileStatus: PractitionerStatus;
    avatarUrl: string | null;
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
    specialties: Array<{
      specialtyId: string;
      slug: string;
      title: string | null;
      isPrimary: boolean;
    }>;
  };
  liveProfile: {
    practitionerType: PractitionerType;
    practitionerGender: PractitionerGender | null;
    profileStatus: PractitionerStatus;
    avatarUrl: string | null;
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
    specialties: Array<{
      specialtyId: string;
      slug: string;
      title: string | null;
      isPrimary: boolean;
    }>;
  };
  credentials: Array<{
    credentialId: string;
    credentialType: CredentialType;
    fileUrl: string;
    reviewStatus: CredentialReviewStatus;
    expiresAt: Date | null;
    uploadedAt: Date;
    reviewedAt: Date | null;
    reviewedByUserId: string | null;
    reviewNotes: string | null;
  }>;
  payoutDestination: {
    methodType: PractitionerPayoutMethodType | null;
    accountHolderName: string | null;
    bankName: string | null;
    bankAccountNumber: string | null;
    iban: string | null;
    walletProvider: string | null;
    walletIdentifier: string | null;
    otherDetails: string | null;
  } | null;
  livePayoutDestination: {
    methodType: PractitionerPayoutMethodType | null;
    accountHolderName: string | null;
    bankName: string | null;
    bankAccountNumber: string | null;
    iban: string | null;
    walletProvider: string | null;
    walletIdentifier: string | null;
    otherDetails: string | null;
  } | null;
  application: {
    applicationId: string;
    status: PractitionerApplicationStatus;
    submittedAt: Date | null;
    reviewedAt: Date | null;
    reviewedByUserId: string | null;
    reviewDecisionReason: string | null;
    reviewNotes: string | null;
  };
  readinessSnapshot: {
    isProfileCompleted: boolean;
    hasRequiredSpecialties: boolean;
    hasRequiredCredentials: boolean;
    hasPayoutDestination: boolean;
    canBeReviewed: boolean;
    canBeApproved: boolean;
  };
  completion: PractitionerApplicationCompletionViewModel;
}

export interface AdminPractitionerApplicationDecisionViewModel {
  applicationId: string;
  practitionerProfileId: string;
  userId: string;
  status: PractitionerApplicationStatus;
  reviewedAt: Date | null;
  reviewedByUserId: string | null;
  reviewDecisionReason: string | null;
  reviewNotes: string | null;
}
