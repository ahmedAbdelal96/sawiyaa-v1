import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuthSessionService } from '../services/auth-session.service';

/**
 * Logout is intentionally just a session revocation use case.
 * Controllers or actor-specific wrappers decide which current session should be revoked.
 * This path must not bump tokenVersion because single-session logout should not
 * invalidate other devices that still hold valid sessions.
 */
@Injectable()
export class RevokeAuthSessionUseCase {
  constructor(private readonly authSessionService: AuthSessionService) {}

  execute(sessionId: string, tx?: Prisma.TransactionClient) {
    return this.authSessionService.revoke(sessionId, tx);
  }
}
