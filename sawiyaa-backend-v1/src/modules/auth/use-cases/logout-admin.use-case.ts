import { Injectable } from '@nestjs/common';
import { RevokeAuthSessionUseCase } from './revoke-auth-session.use-case';

/**
 * Admin logout revokes only the active session represented by the current token.
 */
@Injectable()
export class LogoutAdminUseCase {
  constructor(
    private readonly revokeAuthSessionUseCase: RevokeAuthSessionUseCase,
  ) {}

  execute(sessionId: string) {
    return this.revokeAuthSessionUseCase.execute(sessionId);
  }
}
