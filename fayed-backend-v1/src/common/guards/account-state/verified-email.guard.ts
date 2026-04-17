import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { AuthenticatedRequest } from '../../interfaces/authenticated-request.interface';
import { forbid, getAuthenticatedUser } from '../../utils/auth-request.util';

/**
 * Use for routes that require a verified email before continuing.
 * Typical examples are sensitive profile changes or admin-facing onboarding completion steps.
 */
@Injectable()
export class VerifiedEmailGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = getAuthenticatedUser(request);

    if (user.isEmailVerified !== true) {
      forbid('A verified email is required for this route', 'VERIFIED_EMAIL_REQUIRED');
    }

    return true;
  }
}
