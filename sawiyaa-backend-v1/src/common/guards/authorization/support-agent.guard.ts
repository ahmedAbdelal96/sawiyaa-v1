import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { AppRole } from '../../enums/app-role.enum';
import { AuthenticatedRequest } from '../../interfaces/authenticated-request.interface';
import { forbid, getAuthenticatedUser } from '../../utils/auth-request.util';

/**
 * Support-agent guard for customer-support tools.
 * Keep it separate from AdminGuard so support access can stay narrower than full admin access.
 */
@Injectable()
export class SupportAgentGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = getAuthenticatedUser(request);

    if (!user.roles.includes(AppRole.SUPPORT_AGENT)) {
      forbid(
        'Support agent role is required for this route',
        'SUPPORT_AGENT_ROLE_REQUIRED',
      );
    }

    return true;
  }
}
