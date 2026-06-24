import { Injectable } from '@nestjs/common';
import { AppRole } from '@common/enums/app-role.enum';
import { AuthenticatedUser } from '@common/interfaces/authenticated-user.interface';
import {
  PractitionerStatus,
  UserRole,
  UserRoleType,
  UserStatus,
} from '@prisma/client';
import { AuthenticatedUserContext } from '../types/auth-user-context.types';
import {
  mapUserRoleTypeToAppRole,
  normalizeAppRoles,
} from '../utils/auth-role.util';

type UserWithAuthContext = {
  id: string;
  displayName: string | null;
  status: UserStatus;
  tokenVersion: number;
  roles: UserRole[];
  emails: Array<{ email: string; isPrimary: boolean; isVerified: boolean }>;
  phones: Array<{ phone: string; isPrimary: boolean; isVerified: boolean }>;
  practitionerProfile?: {
    id: string;
    status: PractitionerStatus;
  } | null;
};

/**
 * Central mapper for safe auth user data.
 * It keeps controller responses and request.user hydration consistent across all auth flows.
 */
@Injectable()
export class AuthUserContextMapper {
  toResponse(user: UserWithAuthContext): AuthenticatedUserContext {
    const primaryEmail = user.emails.find((email) => email.isPrimary) ?? null;
    const primaryPhone = user.phones.find((phone) => phone.isPrimary) ?? null;

    return {
      id: user.id,
      displayName: user.displayName,
      status: user.status,
      roles: normalizeAppRoles(
        user.roles.map((role) => mapUserRoleTypeToAppRole(role.role)),
      ),
      primaryEmail: primaryEmail?.email ?? null,
      isEmailVerified: primaryEmail?.isVerified ?? false,
      primaryPhone: primaryPhone?.phone ?? null,
      isPhoneVerified: primaryPhone?.isVerified ?? false,
      practitionerProfileId: user.practitionerProfile?.id ?? null,
      practitionerStatus: user.practitionerProfile?.status ?? null,
    };
  }

  toAuthenticatedRequestUser(
    user: UserWithAuthContext,
    sessionId: string,
    authMethod: 'access' | 'refresh',
  ): AuthenticatedUser {
    const response = this.toResponse(user);
    const roles = normalizeAppRoles(
      user.roles.map((role) => mapUserRoleTypeToAppRole(role.role)),
    );

    return {
      id: response.id,
      roles,
      sessionId,
      authMethod,
      isActive: response.status === UserStatus.ACTIVE,
      isEmailVerified: response.isEmailVerified,
      isPhoneVerified: response.isPhoneVerified,
      practitionerProfileId: response.practitionerProfileId,
      practitionerApplicationId: null,
      isPractitionerOtpVerified:
        authMethod === 'access' && roles.includes(AppRole.PRACTITIONER),
      isPractitionerOnboardingCompleted: false,
      isPractitionerApproved:
        response.practitionerStatus === PractitionerStatus.APPROVED,
      featureFlags: [],
    };
  }

  hasRole(user: UserWithAuthContext, role: UserRoleType): boolean {
    return user.roles.some((assignedRole) => assignedRole.role === role);
  }
}
