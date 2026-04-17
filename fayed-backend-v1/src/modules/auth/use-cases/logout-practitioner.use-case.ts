import { Injectable } from '@nestjs/common';
import { RevokeAuthSessionUseCase } from './revoke-auth-session.use-case';

/**
 * Practitioner logout revokes the current session after OTP-authenticated access has already been established.
 */
@Injectable()
export class LogoutPractitionerUseCase {
  constructor(
    private readonly revokeAuthSessionUseCase: RevokeAuthSessionUseCase,
  ) {}

  execute(sessionId: string) {
    return this.revokeAuthSessionUseCase.execute(sessionId);
  }
}
