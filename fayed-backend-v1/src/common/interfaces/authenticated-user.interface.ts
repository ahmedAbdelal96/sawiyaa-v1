import { AppRole } from '../enums/app-role.enum';

/**
 * The guards baseline works against this normalized request user shape.
 * Auth Module will later be responsible for constructing it from JWT/session data.
 */
export interface AuthenticatedUser {
  id: string;
  roles: AppRole[];
  sessionId?: string;
  authMethod?: 'access' | 'refresh';
  isActive?: boolean;
  isEmailVerified?: boolean;
  isPhoneVerified?: boolean;
  practitionerProfileId?: string | null;
  practitionerApplicationId?: string | null;
  isPractitionerOtpVerified?: boolean;
  isPractitionerOnboardingCompleted?: boolean;
  isPractitionerApproved?: boolean;
  featureFlags?: string[];
}
