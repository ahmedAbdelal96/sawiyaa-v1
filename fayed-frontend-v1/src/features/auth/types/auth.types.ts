/**
 * Auth feature types mapped to the current backend auth/users contracts.
 * These types are intentionally DTO-like to keep API and hook signatures explicit.
 */

export type AppRole =
  | "SUPER_ADMIN"
  | "ADMIN"
  | "FINANCE_STAFF"
  | "MARKETING_STAFF"
  | "PRACTITIONER_REVIEWER"
  | "PATIENT_OPERATIONS"
  | "SUPPORT_AGENT"
  | "CONTENT_REVIEWER"
  | "PATIENT"
  | "PRACTITIONER";

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
}

export interface PatientLoginRequest {
  email: string;
  password: string;
  deviceId?: string;
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
}

export type PractitionerLoginResponse =
  | OtpChallengeResponse
  | AuthSuccessResponse;

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

export interface AdminLoginRequest {
  email: string;
  password: string;
  deviceId?: string;
}

export interface AdminStepUpVerifyRequest {
  password: string;
}

export interface AdminStepUpVerifyResponse {
  message: string;
  expiresAt: string;
}
