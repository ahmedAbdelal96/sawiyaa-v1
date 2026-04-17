/**
 * Users feature read-only contracts from /users/me endpoints.
 */
import type {
  AppRole,
  PractitionerStatus,
  UserStatus,
} from "@/features/auth/types/auth.types";

export interface CurrentUserIdentitySummary {
  primaryEmail: string | null;
  primaryEmailMasked: string | null;
  primaryPhone: string | null;
  primaryPhoneMasked: string | null;
}

export interface CurrentUserRoleSummary {
  roles: AppRole[];
  hasPatientRole: boolean;
  hasPractitionerRole: boolean;
  hasAdminRole: boolean;
  hasSupportAgentRole: boolean;
  hasContentReviewerRole: boolean;
}

export interface CurrentUserSecurityState {
  accountStatus: UserStatus;
  isActive: boolean;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  hasPractitionerOtpVerifiedSession: boolean;
}

export interface CurrentUserProfileLinks {
  patientProfileId: string | null;
  practitionerProfileId: string | null;
  practitionerStateSummary: PractitionerStatus | null;
}

export interface CurrentUserSummary {
  userId: string;
  displayName: string | null;
  locale: string | null;
  avatarUrl: string | null;
  avatarDataUrl: string | null;
  accountStatus: UserStatus;
  createdAt: string;
  identitySummary: CurrentUserIdentitySummary;
  roles: CurrentUserRoleSummary;
  securityState: CurrentUserSecurityState;
  profileLinks: CurrentUserProfileLinks;
}

export interface CurrentUserRolesResponse {
  userId: string;
  roles: AppRole[];
  roleSummary: CurrentUserRoleSummary;
}

export interface CurrentUserSecurityStateResponse {
  userId: string;
  securityState: CurrentUserSecurityState;
}
