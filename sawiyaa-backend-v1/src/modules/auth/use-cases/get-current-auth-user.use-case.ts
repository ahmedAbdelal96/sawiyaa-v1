import { Injectable } from '@nestjs/common';
import { AuthenticatedUser } from '@common/interfaces/authenticated-user.interface';

/**
 * /auth/me is intentionally auth/session-oriented.
 * It returns the normalized authenticated request context so clients can inspect the active session/auth state
 * without depending on the richer product-facing current-user summary exposed by Users Module.
 */
@Injectable()
export class GetCurrentAuthUserUseCase {
  execute(authenticatedUser: AuthenticatedUser) {
    return {
      userId: authenticatedUser.id,
      roles: authenticatedUser.roles,
      sessionId: authenticatedUser.sessionId ?? null,
      authMethod: authenticatedUser.authMethod ?? null,
      isActive: authenticatedUser.isActive === true,
      isEmailVerified: authenticatedUser.isEmailVerified === true,
      isPhoneVerified: authenticatedUser.isPhoneVerified === true,
      practitionerProfileId: authenticatedUser.practitionerProfileId ?? null,
      isPractitionerOtpVerified:
        authenticatedUser.isPractitionerOtpVerified === true,
      isPractitionerApproved: authenticatedUser.isPractitionerApproved === true,
      featureFlags: authenticatedUser.featureFlags ?? [],
    };
  }
}
