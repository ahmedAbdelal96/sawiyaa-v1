import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { AuthenticatedRequest } from '../../interfaces/authenticated-request.interface';
import { forbid, getAuthenticatedUser } from '../../utils/auth-request.util';

/**
 * Ensures the user account is active.
 * It does not authenticate the user; it assumes authentication already populated request.user.
 */
@Injectable()
export class ActiveAccountGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = getAuthenticatedUser(request);

    if (user.isActive !== true) {
      forbid('An active account is required for this route', 'ACTIVE_ACCOUNT_REQUIRED');
    }

    return true;
  }
}
