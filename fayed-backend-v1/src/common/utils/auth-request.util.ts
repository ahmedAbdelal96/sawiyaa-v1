import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { AuthenticatedRequest } from '../interfaces/authenticated-request.interface';
import { AuthenticatedUser } from '../interfaces/authenticated-user.interface';

/**
 * Shared helpers keep guard implementations small and consistent.
 * They only read normalized request state and never talk directly to the database.
 */
export function getAuthenticatedUser(
  request: AuthenticatedRequest,
): AuthenticatedUser {
  if (!request.user) {
    throw new UnauthorizedException({
      messageKey: 'auth.errors.authenticationRequired',
      error: 'AUTHENTICATION_REQUIRED',
    });
  }

  return request.user;
}

export function ensureAccessTokenUser(
  request: AuthenticatedRequest,
): AuthenticatedUser {
  const user = getAuthenticatedUser(request);

  if (user.authMethod !== 'access') {
    throw new UnauthorizedException({
      messageKey: 'auth.errors.accessTokenRequired',
      error: 'ACCESS_TOKEN_REQUIRED',
    });
  }

  return user;
}

export function ensureRefreshTokenUser(
  request: AuthenticatedRequest,
): AuthenticatedUser {
  const user = getAuthenticatedUser(request);

  if (user.authMethod !== 'refresh') {
    throw new UnauthorizedException({
      messageKey: 'auth.errors.refreshTokenTypeRequired',
      error: 'REFRESH_TOKEN_REQUIRED',
    });
  }

  return user;
}

export function forbid(message: string, error: string): never {
  throw new ForbiddenException({ message, error });
}
