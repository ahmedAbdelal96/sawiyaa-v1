export type AppRole = "PATIENT" | "PRACTITIONER" | "ADMIN" | "SUPPORT_AGENT" | "CONTENT_REVIEWER";

export type UserStatus =
  | "ACTIVE"
  | "INACTIVE"
  | "SUSPENDED"
  | "PENDING_VERIFICATION"
  | "PENDING_APPROVAL"
  | "DELETED";

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: string;
  refreshTokenExpiresAt: string;
};

export type AuthUser = {
  id: string;
  displayName: string | null;
  primaryEmail: string | null;
  roles: AppRole[];
  status: UserStatus;
};

export type CurrentUserSummary = {
  userId: string;
  displayName: string | null;
  locale: string | null;
  accountStatus: UserStatus;
  roles: {
    roles: AppRole[];
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

export type AuthSession = {
  tokens: AuthTokens;
  user: AuthUser;
};

