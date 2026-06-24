import { Injectable } from '@nestjs/common';
import { RefreshAuthSessionUseCase } from './refresh-auth-session.use-case';
import { AuthSessionDeviceContext } from '../types/auth-session.types';
import { ADMIN_AUTH_ROLE_TYPES } from '../utils/auth-role.util';

/**
 * Admin refresh supports all internal admin-class tokens.
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
      expectedRoles: [...ADMIN_AUTH_ROLE_TYPES],
      deviceContext: input.deviceContext,
    });
  }
}
