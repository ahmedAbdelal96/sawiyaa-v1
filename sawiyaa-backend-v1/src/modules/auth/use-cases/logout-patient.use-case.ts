import { Injectable } from '@nestjs/common';
import { RevokeAuthSessionUseCase } from './revoke-auth-session.use-case';

/**
 * Patient logout revokes only the current session.
 */
@Injectable()
export class LogoutPatientUseCase {
  constructor(
    private readonly revokeAuthSessionUseCase: RevokeAuthSessionUseCase,
  ) {}

  execute(sessionId: string) {
    return this.revokeAuthSessionUseCase.execute(sessionId);
  }
}
