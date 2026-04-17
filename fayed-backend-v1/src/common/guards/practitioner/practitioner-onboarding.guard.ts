import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { AuthenticatedRequest } from '../../interfaces/authenticated-request.interface';
import { forbid, getAuthenticatedUser } from '../../utils/auth-request.util';

/**
 * Practitioner onboarding completion guard.
 * Use it for practitioner-only routes that require profile/application setup before normal operation.
 */
@Injectable()
export class PractitionerOnboardingGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = getAuthenticatedUser(request);

    if (user.isPractitionerOnboardingCompleted !== true) {
      forbid(
        'Practitioner onboarding must be completed before accessing this route',
        'PRACTITIONER_ONBOARDING_REQUIRED',
      );
    }

    return true;
  }
}
