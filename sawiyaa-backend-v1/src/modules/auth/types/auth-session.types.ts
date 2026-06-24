import { UserRoleType } from '@prisma/client';

/**
 * Session metadata is captured at login/refresh so token issuance and audit remain consistent.
 */
export interface AuthSessionDeviceContext {
  deviceId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  countryCode?: string | null;
  countryCodeSource?: 'HEADER_CF' | 'HEADER_VERCEL' | 'DEV_OVERRIDE' | 'NONE' | null;
}

export interface CreateAuthSessionInput extends AuthSessionDeviceContext {
  sessionId: string;
  userId: string;
  role: UserRoleType;
  refreshToken: string;
  refreshExpiresAt: Date;
}

export interface RefreshSessionInput extends AuthSessionDeviceContext {
  sessionId: string;
  refreshToken: string;
  refreshExpiresAt: Date;
}
