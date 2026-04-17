import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../../constants/auth-metadata.constants';
import { AuthenticatedRequest } from '../../interfaces/authenticated-request.interface';
import { ensureRefreshTokenUser } from '../../utils/auth-request.util';

/**
 * Refresh-token guard for rotation/logout/session refresh endpoints.
 * It should not protect normal application routes; use JwtAccessAuthGuard there instead.
 */
@Injectable()
export class JwtRefreshAuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    ensureRefreshTokenUser(request);
    return true;
  }
}
