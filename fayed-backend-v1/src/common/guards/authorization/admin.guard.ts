import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { AppRole } from '../../enums/app-role.enum';
import { AuthenticatedRequest } from '../../interfaces/authenticated-request.interface';
import { forbid, getAuthenticatedUser } from '../../utils/auth-request.util';

/**
 * Narrow admin-only guard for routes that should never be shared with other back-office roles.
 * Prefer this guard when the route changes system state or exposes highly privileged data.
 */
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = getAuthenticatedUser(request);

    if (!user.roles.includes(AppRole.ADMIN)) {
      forbid('Admin role is required for this route', 'ADMIN_ROLE_REQUIRED');
    }

    return true;
  }
}
