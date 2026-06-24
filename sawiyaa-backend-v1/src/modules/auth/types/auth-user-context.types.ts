import { AppRole } from '@common/enums/app-role.enum';
import { PractitionerStatus, UserStatus } from '@prisma/client';

/**
 * Safe authenticated user shape returned by /auth/me and auth endpoints.
 * It intentionally excludes password hashes, OTP details, and refresh session secrets.
 */
export interface AuthenticatedUserContext {
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

export interface AuthTokensResult {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: Date;
  refreshTokenExpiresAt: Date;
}

export interface AuthSuccessResult {
  tokens: AuthTokensResult;
  user: AuthenticatedUserContext;
}
