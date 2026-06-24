import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../../constants/auth-metadata.constants';
import { AuthenticatedRequest } from '../../interfaces/authenticated-request.interface';
import { ensureAccessTokenUser } from '../../utils/auth-request.util';

/**
 * Baseline access-token guard.
 * Today it validates the normalized request contract only; Auth Module will later attach request.user from JWT.
 */
@Injectable()
export class JwtAccessAuthGuard implements CanActivate {
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
    ensureAccessTokenUser(request);
    return true;
  }
}
