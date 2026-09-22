import { Injectable } from '@nestjs/common';
import { RevokeAuthSessionUseCase } from './revoke-auth-session.use-case';

@Injectable()
export class LogoutTraineeUseCase {
  constructor(private readonly revokeAuthSessionUseCase: RevokeAuthSessionUseCase) {}
  execute(sessionId: string) { return this.revokeAuthSessionUseCase.execute(sessionId); }
}
