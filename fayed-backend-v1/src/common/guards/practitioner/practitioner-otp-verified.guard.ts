import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { AuthenticatedRequest } from '../../interfaces/authenticated-request.interface';
import { forbid, getAuthenticatedUser } from '../../utils/auth-request.util';

/**
 * Practitioner login uses password + OTP in Phase 1.
 * This guard is for routes that must only run after the OTP step has been completed successfully.
 */
@Injectable()
export class PractitionerOtpVerifiedGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = getAuthenticatedUser(request);

    if (user.isPractitionerOtpVerified !== true) {
      forbid(
        'Practitioner OTP verification is required for this route',
        'PRACTITIONER_OTP_REQUIRED',
      );
    }

    return true;
  }
}
