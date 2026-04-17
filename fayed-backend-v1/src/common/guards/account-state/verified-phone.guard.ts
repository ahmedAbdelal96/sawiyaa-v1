import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { AuthenticatedRequest } from '../../interfaces/authenticated-request.interface';
import { forbid, getAuthenticatedUser } from '../../utils/auth-request.util';

/**
 * Use for phone-sensitive flows such as OTP-protected operations.
 * This guard checks verification state only; OTP freshness belongs to separate guards or policies.
 */
@Injectable()
export class VerifiedPhoneGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = getAuthenticatedUser(request);

    if (user.isPhoneVerified !== true) {
      forbid('A verified phone is required for this route', 'VERIFIED_PHONE_REQUIRED');
    }

    return true;
  }
}
