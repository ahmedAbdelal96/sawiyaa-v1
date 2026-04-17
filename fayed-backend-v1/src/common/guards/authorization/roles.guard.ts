import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../../constants/auth-metadata.constants';
import { AppRole } from '../../enums/app-role.enum';
import { AuthenticatedRequest } from '../../interfaces/authenticated-request.interface';
import { forbid, getAuthenticatedUser } from '../../utils/auth-request.util';

/**
 * Shared role guard used by most authorization checks.
 * It assumes authentication already happened and focuses only on role membership.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles =
      this.reflector.getAllAndOverride<AppRole[]>(ROLES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? [];

    if (requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = getAuthenticatedUser(request);
    const hasRole = requiredRoles.some((role) => user.roles.includes(role));

    if (!hasRole) {
      forbid('You do not have the required role for this route', 'ROLE_REQUIRED');
    }

    return true;
  }
}
