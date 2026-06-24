import { Injectable } from '@nestjs/common';
import { UserRoleType } from '@prisma/client';
import { RefreshAuthSessionUseCase } from './refresh-auth-session.use-case';
import { AuthSessionDeviceContext } from '../types/auth-session.types';

/**
 * Patient refresh is a thin wrapper around the shared refresh flow with a patient role boundary.
 */
@Injectable()
export class RefreshPatientTokenUseCase {
  constructor(
    private readonly refreshAuthSessionUseCase: RefreshAuthSessionUseCase,
  ) {}

  execute(input: {
    refreshToken: string;
    deviceContext: AuthSessionDeviceContext;
  }) {
    return this.refreshAuthSessionUseCase.execute({
      refreshToken: input.refreshToken,
      expectedRoles: [UserRoleType.PATIENT],
      deviceContext: input.deviceContext,
    });
  }
}
