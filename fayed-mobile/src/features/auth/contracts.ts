/**
 * Raw role values the backend may return for any user.
 * This is a superset — the mobile app only acts on PATIENT and PRACTITIONER.
 * Admin-class roles (ADMIN, SUPER_ADMIN, FINANCE_STAFF, etc.) are intentionally
 * excluded from this union: the mobile app must never accept or process them.
 */
export type AppRole = "PATIENT" | "PRACTITIONER";

export type UserStatus =
  | "ACTIVE"
  | "INACTIVE"
  | "SUSPENDED"
  | "PENDING_VERIFICATION"
  | "PENDING_APPROVAL"
  | "DELETED";

export type PractitionerStatus =
  | "DRAFT"
  | "PENDING_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "SUSPENDED"
  | "INACTIVE";

/**
 * The only roles the mobile app supports at runtime.
 * Admin-class roles are explicitly excluded; this type must never include "admin".
 */
export type MobileSupportedRole = "patient" | "practitioner";

/**
 * @deprecated Use MobileSupportedRole. Kept as alias so existing usages compile
 * without a mass rename — will be removed once all callsites are migrated.
 */
export type MobileRole = MobileSupportedRole;

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: string;
  refreshTokenExpiresAt: string;
}

export interface AuthenticatedUser {
  id: string;
  displayName: string | null;
  status: UserStatus;
  roles: AppRole[];
  primaryEmail: string | null;
  isEmailVerified: boolean;
  primaryPhone: string | null;
  isPhoneVerified: boolean;
  practitionerProfileId: string | null;
  practitionerStatus: PractitionerStatus | null;
}

export interface AuthSuccessResponse {
  message: string;
  tokens: AuthTokens;
  user: AuthenticatedUser;
}

export interface MessageResponse {
  message: string;
}

export interface OtpChallengeResponse {
  message: string;
  challengeId: string;
  channel: string;
  maskedTarget: string;
  expiresAt: string;
  requiresOtpVerification: boolean;
}

export type PractitionerLoginResponse = AuthSuccessResponse | OtpChallengeResponse;

export interface PractitionerRegistrationResponse {
  message: string;
  userId: string;
  requiresOtpOnLogin: boolean;
}

export interface CurrentAuthUserResponse {
  userId: string;
  roles: AppRole[];
  sessionId: string | null;
  authMethod: "access" | "refresh" | null;
  isActive: boolean;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  practitionerProfileId: string | null;
  isPractitionerOtpVerified: boolean;
  isPractitionerApproved: boolean;
  featureFlags: string[];
}

export interface RefreshTokenRequest {
  refreshToken?: string;
  deviceId?: string;
}

export interface PatientGoogleAuthRequest {
  idToken: string;
  deviceId?: string;
}

export interface PatientRegisterRequest {
  email: string;
  password: string;
  displayName?: string;
  deviceId?: string;
  phone?: string;
}

export interface PatientLoginRequest {
  email: string;
  password: string;
  deviceId?: string;
}

export interface PatientForgotPasswordRequest {
  email: string;
}

export interface PatientResetPasswordRequest {
  email: string;
  code: string;
  newPassword: string;
}

export interface PractitionerRegisterRequest {
  email: string;
  otpEmail?: string;
  password: string;
  displayName?: string;
  practitionerType?:
    | "PSYCHOLOGIST"
    | "PSYCHIATRIST"
    | "NUTRITIONIST"
    | "WEIGHT_LOSS_SPECIALIST"
    | "COUNSELOR"
    | "OTHER";
  professionalTitle?: string;
  bio?: string;
  yearsOfExperience?: number;
  countryCode?: string;
  primarySpecialtyCategoryId: string;
  specialtyIds: string[];
  initialCredential?: {
    credentialType:
      | "LICENSE"
      | "DEGREE"
      | "CERTIFICATION"
      | "NATIONAL_ID"
      | "PASSPORT"
      | "MEMBERSHIP"
      | "OTHER";
    fileUrl: string;
    expiresAt?: string;
  };
}

export interface PractitionerLoginRequest {
  email: string;
  password: string;
  deviceId?: string;
}

export interface PractitionerVerifyOtpRequest {
  challengeId: string;
  code: string;
  deviceId?: string;
}

export interface PractitionerForgotPasswordRequest {
  email: string;
}

export interface PractitionerResetPasswordRequest {
  email: string;
  code: string;
  newPassword: string;
}

export interface PersistedAuthSession {
  role: MobileSupportedRole;
  user: AuthenticatedUser;
  tokens: AuthTokens;
}
