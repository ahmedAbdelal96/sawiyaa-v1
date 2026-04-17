import { Injectable } from '@nestjs/common';
import { UserRoleType } from '@prisma/client';
import { RefreshAuthSessionUseCase } from './refresh-auth-session.use-case';
import { AuthSessionDeviceContext } from '../types/auth-session.types';

/**
 * Admin refresh supports both ADMIN and SUPER_ADMIN tokens.
 */
@Injectable()
export class RefreshAdminTokenUseCase {
  constructor(
    private readonly refreshAuthSessionUseCase: RefreshAuthSessionUseCase,
  ) {}

  execute(input: {
    refreshToken: string;
    deviceContext: AuthSessionDeviceContext;
  }) {
    return this.refreshAuthSessionUseCase.execute({
      refreshToken: input.refreshToken,
      expectedRoles: [UserRoleType.ADMIN, UserRoleType.SUPER_ADMIN],
      deviceContext: input.deviceContext,
    });
  }
}
