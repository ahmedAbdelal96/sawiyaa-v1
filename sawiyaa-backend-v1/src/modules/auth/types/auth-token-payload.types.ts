import { UserRoleType } from '@prisma/client';

/**
 * Shared JWT payload used across access and refresh tokens.
 * It stays intentionally small so tokens remain stable even if user profile data changes.
 * tokenVersion captures the user auth invalidation snapshot at issuance time.
 */
export interface AuthTokenPayload {
  sub: string;
  sessionId: string;
  role: UserRoleType;
  tokenVersion: number;
  tokenType: 'access' | 'refresh';
}
