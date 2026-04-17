import { AppRole } from '@common/enums/app-role.enum';
import { PractitionerStatus, UserStatus } from '@prisma/client';

/**
 * These read-model types define the internal shape used by Users Module.
 * They deliberately stay read-only and UI-oriented so the module does not drift into auth or profile management concerns.
 */
export interface CurrentUserBasicsReadModel {
  id: string;
  displayName: string | null;
  locale: string | null;
  accountStatus: UserStatus;
  createdAt: Date;
  primaryEmail: string | null;
  isEmailVerified: boolean;
  primaryPhone: string | null;
  isPhoneVerified: boolean;
}

export interface CurrentUserRoleSummaryReadModel {
  roles: AppRole[];
  hasPatientRole: boolean;
  hasPractitionerRole: boolean;
  hasAdminRole: boolean;
  hasSupportAgentRole: boolean;
  hasContentReviewerRole: boolean;
}

export interface CurrentUserSecurityStateReadModel {
  accountStatus: UserStatus;
  isActive: boolean;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  hasPractitionerOtpVerifiedSession: boolean;
}

export interface CurrentUserProfileLinksReadModel {
  patientProfileId: string | null;
  practitionerProfileId: string | null;
  practitionerStateSummary: PractitionerStatus | null;
}

export interface CurrentUserReadModel {
  userId: string;
  displayName: string | null;
  locale: string | null;
  avatarUrl: string | null;
  avatarDataUrl: string | null;
  accountStatus: UserStatus;
  createdAt: Date;
  identitySummary: {
    primaryEmail: string | null;
    primaryEmailMasked: string | null;
    primaryPhone: string | null;
    primaryPhoneMasked: string | null;
  };
  roles: CurrentUserRoleSummaryReadModel;
  securityState: CurrentUserSecurityStateReadModel;
  profileLinks: CurrentUserProfileLinksReadModel;
}
