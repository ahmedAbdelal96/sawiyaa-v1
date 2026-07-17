import { HttpException, HttpStatus, UnauthorizedException } from '@nestjs/common';
import { AuthLockoutState } from '../types/auth-lockout.types';

export interface AuthLockoutResponsePayload {
  errorCode: string;
  messageKey: string;
  remainingAttempts: number;
  maxAttempts: number;
  lockedUntil: string | null;
  retryAfterSeconds: number | null;
}

export function buildAuthLockoutResponsePayload(
  state: AuthLockoutState,
): AuthLockoutResponsePayload {
  return {
    errorCode: state.isLocked
      ? 'LOGIN_TEMPORARILY_LOCKED'
      : 'INVALID_CREDENTIALS',
    messageKey: state.isLocked
      ? 'auth.errors.loginTemporarilyLocked'
      : 'auth.errors.invalidCredentials',
    remainingAttempts: state.remainingAttempts,
    maxAttempts: state.maxAttempts,
    lockedUntil: state.lockedUntil?.toISOString() ?? null,
    retryAfterSeconds: state.isLocked ? state.retryAfterSeconds : null,
  };
}

export function createInvalidLoginException(state: AuthLockoutState) {
  return new UnauthorizedException(buildAuthLockoutResponsePayload(state));
}

export function createLockedLoginException(state: AuthLockoutState) {
  return new HttpException(
    buildAuthLockoutResponsePayload(state),
    HttpStatus.TOO_MANY_REQUESTS,
  );
}
