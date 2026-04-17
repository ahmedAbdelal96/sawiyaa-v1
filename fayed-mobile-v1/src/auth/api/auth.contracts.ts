import type { ApiEnvelope } from "@/networking/contracts/api-envelope";

export type LoginPayload = {
  email: string;
  password: string;
  deviceId?: string;
};

export type RegisterPayload = {
  email: string;
  password: string;
  displayName?: string;
  deviceId?: string;
};

export type AuthSuccessResponse = {
  message: string;
  tokens: {
    accessToken: string;
    refreshToken: string;
    accessTokenExpiresAt: string;
    refreshTokenExpiresAt: string;
  };
  user: {
    id: string;
    displayName: string | null;
    status: "ACTIVE" | "INACTIVE" | "SUSPENDED" | "PENDING_VERIFICATION" | "PENDING_APPROVAL" | "DELETED";
    roles: Array<"PATIENT" | "PRACTITIONER" | "ADMIN" | "SUPPORT_AGENT" | "CONTENT_REVIEWER">;
    primaryEmail: string | null;
  };
};

export type CurrentUserSummaryResponse = {
  userId: string;
  displayName: string | null;
  locale: string | null;
  accountStatus: "ACTIVE" | "INACTIVE" | "SUSPENDED" | "PENDING_VERIFICATION" | "PENDING_APPROVAL" | "DELETED";
  roles: {
    roles: Array<"PATIENT" | "PRACTITIONER" | "ADMIN" | "SUPPORT_AGENT" | "CONTENT_REVIEWER">;
    hasPatientRole: boolean;
  };
  securityState: {
    isActive: boolean;
    isEmailVerified: boolean;
    isPhoneVerified: boolean;
  };
  profileLinks: {
    patientProfileId: string | null;
  };
};

export type LogoutResponse = {
  message: string;
};

export type AuthSuccessEnvelope = ApiEnvelope<AuthSuccessResponse>;
export type CurrentUserSummaryEnvelope = ApiEnvelope<CurrentUserSummaryResponse>;
export type LogoutEnvelope = ApiEnvelope<LogoutResponse>;

