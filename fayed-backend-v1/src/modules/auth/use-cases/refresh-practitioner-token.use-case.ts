import { Injectable } from '@nestjs/common';
import { UserRoleType } from '@prisma/client';
import { RefreshAuthSessionUseCase } from './refresh-auth-session.use-case';
import { AuthSessionDeviceContext } from '../types/auth-session.types';

/**
 * Practitioner refresh keeps the actor boundary explicit even though the underlying session rotation is shared.
 */
@Injectable()
export class RefreshPractitionerTokenUseCase {
  constructor(
    private readonly refreshAuthSessionUseCase: RefreshAuthSessionUseCase,
  ) {}

  execute(input: {
    refreshToken: string;
    deviceContext: AuthSessionDeviceContext;
  }) {
    return this.refreshAuthSessionUseCase.execute({
      refreshToken: input.refreshToken,
      expectedRoles: [UserRoleType.PRACTITIONER],
      deviceContext: input.deviceContext,
    });
  }
}
