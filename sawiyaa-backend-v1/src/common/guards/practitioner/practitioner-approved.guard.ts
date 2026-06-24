import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { AuthenticatedRequest } from '../../interfaces/authenticated-request.interface';
import { forbid, getAuthenticatedUser } from '../../utils/auth-request.util';

/**
 * Ensures the practitioner's application has been approved.
 * Use after onboarding for routes that expose operational practitioner capabilities.
 */
@Injectable()
export class PractitionerApprovedGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = getAuthenticatedUser(request);

    if (user.isPractitionerApproved !== true) {
      forbid(
        'Practitioner approval is required for this route',
        'PRACTITIONER_APPROVAL_REQUIRED',
      );
    }

    return true;
  }
}
