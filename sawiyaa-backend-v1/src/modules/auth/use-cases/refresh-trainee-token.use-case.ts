import { Injectable } from '@nestjs/common';
import { UserRoleType } from '@prisma/client';
import { RefreshAuthSessionUseCase } from './refresh-auth-session.use-case';
import { AuthSessionDeviceContext } from '../types/auth-session.types';

@Injectable()
export class RefreshTraineeTokenUseCase {
  constructor(private readonly refreshAuthSessionUseCase: RefreshAuthSessionUseCase) {}
  execute(input: { refreshToken: string; deviceContext: AuthSessionDeviceContext }) {
    return this.refreshAuthSessionUseCase.execute({ refreshToken: input.refreshToken, expectedRoles: [UserRoleType.TRAINEE], deviceContext: input.deviceContext });
  }
}
