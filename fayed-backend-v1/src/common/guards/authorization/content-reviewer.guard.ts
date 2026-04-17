import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { AppRole } from '../../enums/app-role.enum';
import { AuthenticatedRequest } from '../../interfaces/authenticated-request.interface';
import { forbid, getAuthenticatedUser } from '../../utils/auth-request.util';

/**
 * Content-reviewer guard for moderation and approval queues.
 * It avoids coupling reviewer privileges to broader admin privileges.
 */
@Injectable()
export class ContentReviewerGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = getAuthenticatedUser(request);

    if (!user.roles.includes(AppRole.CONTENT_REVIEWER)) {
      forbid(
        'Content reviewer role is required for this route',
        'CONTENT_REVIEWER_ROLE_REQUIRED',
      );
    }

    return true;
  }
}
